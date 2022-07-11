import { ApplicationCommandOptionData, ApplicationCommandSubCommandData, Collection, CommandInteraction, Interaction, Message, MessageEmbed } from 'discord.js';
import { promisify } from 'util';
import { Meinu } from '.';

// eslint-disable-next-line no-unused-vars
export type CommandRes<T> = (bot: T, interaction: CommandInteraction) => string | MessageEmbed | Promise<string> | Promise<MessageEmbed> | void | Promise<void>;

// eslint-disable-next-line no-unused-vars
export type interactionHandler<T> = (bot: T, interaction: Interaction, msg?: Message) => void;

interface CommandInfoBasics {
	name: string;
	description: string;
}

interface CommandInfoMessage extends CommandInfoBasics {
	type: 'MESSAGE';
}

interface CommandInfoUser extends CommandInfoBasics {
	type: 'USER';
}

interface CommandInfoChat extends CommandInfoBasics {
	type?: 'CHAT_INPUT';
	options?: ApplicationCommandOptionData[];
}

type CommandInfo = CommandInfoMessage | CommandInfoUser | CommandInfoChat;

export class Command<Inst = Meinu> {
	name: string;
	description: string;
	type: CommandInfo['type'];
	options: ApplicationCommandOptionData[] = [];
	// eslint-disable-next-line no-use-before-define
	subcommands: Command[] = [];
	handler: interactionHandler<Inst>;
	response: CommandRes<Inst>;
	interactions = new Collection<string, CommandInteraction>();

	constructor(opts: CommandInfo) {
		this.name = opts.name ?? '';
		this.description = opts.description ?? '';
		this.type = opts.type ?? 'CHAT_INPUT';
		if (opts.type === 'CHAT_INPUT') {
			this.options = opts.options ?? [];
		}
	}

	addSubCommands(subcommands: Command[]): this {
		this.subcommands.push(...subcommands);
		for (const subcmd of this.subcommands) {
			this.options.push({
				name: subcmd.name,
				description: subcmd.description,
				type: 'SUB_COMMAND',
				options: subcmd.options as ApplicationCommandSubCommandData['options']
			});
		}
		return this;
	}

	commandInfo(): CommandInfo {
		const res: CommandInfo = {
			name: this.name,
			description: this.description,
			type: this.type
		};
		if (res.type === 'CHAT_INPUT') {
			res.options = this.options;
		}

		return res;
	}

	interactionHandler(cb: interactionHandler<Inst>): this {
		this.handler = cb;
		return this;
	}

	async handleInteraction(bot: Inst, interaction: Interaction, msg?: Message): Promise<void> {
		return this.handler(bot, interaction, msg);
	}

	run(cb: CommandRes<Inst>): this {
		this.response = cb;
		return this;
	}

	async handle(bot: Inst, interaction: CommandInteraction): Promise<string | MessageEmbed | void> {
		console.log(this);
		this.interactions.set(interaction.id, interaction);
		return this.response(bot, interaction);
	}

	wait = promisify(setTimeout);
}
export class Commands extends Collection<string, Command> {}
