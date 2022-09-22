/* eslint-disable no-unused-vars */
import {
	ApplicationCommandOptionData,
	ApplicationCommandOptionType,
	ApplicationCommandSubCommandData,
	ApplicationCommandType,
	AutocompleteInteraction,
	ButtonInteraction,
	ChatInputCommandInteraction,
	Interaction,
	InteractionResponse,
	MessageContextMenuCommandInteraction,
	ModalSubmitInteraction,
	SelectMenuInteraction,
	UserContextMenuCommandInteraction
} from 'discord.js';
import { Meinu } from './index.js';

export interface CommandInteractionHandlers<Inst> {
	chatInput: (bot: Inst, int: ChatInputCommandInteraction) => Promise<InteractionResponse | void>;
	button: (bot: Inst, int: ButtonInteraction) => Promise<InteractionResponse | void>;
	modalSubmit: (bot: Inst, int: ModalSubmitInteraction) => Promise<InteractionResponse | void>;
	selectMenu: (bot: Inst, int: SelectMenuInteraction) => Promise<InteractionResponse | void>;
	userContextMenu: (bot: Inst, int: UserContextMenuCommandInteraction) => Promise<InteractionResponse | void>;
	messageContextMenu: (bot: Inst, int: MessageContextMenuCommandInteraction) => Promise<InteractionResponse | void>;
	autocomplete: (bot: Inst, int: AutocompleteInteraction) => Promise<InteractionResponse | void>;
}

type handler<Inst, T extends keyof CommandInteractionHandlers<Inst>> = Partial<{
	[K in T]: CommandInteractionHandlers<Inst>[K];
}>;

interface CommandInfoBasics {
	name: string;
	ownersOnly?: boolean;
	dmPermission?: boolean;
}

interface CommandInfoMessage extends CommandInfoBasics {
	type: ApplicationCommandType.Message;
}

interface CommandInfoUser extends CommandInfoBasics {
	type: ApplicationCommandType.User;
}

interface CommandInfoChat extends CommandInfoBasics {
	type?: ApplicationCommandType.ChatInput;
	description: string;
	options?: ApplicationCommandOptionData[];
}

export type CommandInfo = CommandInfoChat | CommandInfoMessage | CommandInfoUser;

// eslint-disable-next-line no-unused-vars
type HasPermission<Inst = Meinu> = (bot: Inst, int: Interaction) => Promise<boolean>;

interface SubCommandGroup<T> {
	name: string;
	description: string;
	commands: T[];
}

export class Command<Inst = Meinu> {
	name: string;
	description: string;
	dmPermission: boolean;
	type: CommandInfo['type'];
	options: ApplicationCommandOptionData[] = [];
	// eslint-disable-next-line no-use-before-define
	subcommands: Command<Inst>[] = [];
	private handlers: handler<Inst, keyof CommandInteractionHandlers<Inst>> = {};
	permissionRes: HasPermission<Inst>;
	ownersOnly: boolean;

	constructor(info: CommandInfo) {
		this.name = info.name ?? '';
		this.ownersOnly = info.ownersOnly ?? false;
		info.type = info.type ?? ApplicationCommandType.ChatInput;
		this.type = info.type;
		this.dmPermission = info.dmPermission;
		if (info.type === ApplicationCommandType.ChatInput) {
			this.description = info.description ?? '';
			this.options = info.options ?? [];
		}
	}

	addSubCommandGroup(group: SubCommandGroup<Command<Inst>>): this {
		for (const cmd of group.commands) {
			this.subcommands.push(cmd);
		}
		this.options.push({
			name: group.name,
			description: group.description,
			type: ApplicationCommandOptionType.SubcommandGroup,
			options: group.commands.map((c) => {
				const opts: ApplicationCommandOptionData = {
					name: c.name,
					description: c.description,
					type: ApplicationCommandOptionType.Subcommand
				};
				if (c.options.length > 0) {
					opts.options = c.options as ApplicationCommandSubCommandData['options'];
				}
				return opts;
			})
		});

		return this;
	}

	addSubCommands(cmds: Command<Inst>[]): this {
		this.subcommands.push(...cmds);
		for (const cmd of cmds) {
			const opts: ApplicationCommandOptionData = {
				name: cmd.name,
				description: cmd.description,
				type: ApplicationCommandOptionType.Subcommand
			};
			if (cmd.options.length > 0) {
				opts.options = cmd.options as ApplicationCommandSubCommandData['options'];
			}
			this.options.push(opts);
		}
		return this;
	}

	commandInfo(): CommandInfo {
		const res: CommandInfo = {
			name: this.name,
			description: this.description ?? '',
			type: this.type
		};
		if (typeof this.dmPermission !== 'undefined') {
			res.dmPermission = this.dmPermission;
		}
		if (res.type === ApplicationCommandType.ChatInput) {
			if (this.options.length > 0) {
				res.options = this.options;
			}
		}

		return res;
	}

	addHandler<T extends keyof CommandInteractionHandlers<Inst>>(type: T, handler: CommandInteractionHandlers<Inst>[T]): this {
		this.handlers[type] = handler as any;
		return this;
	}

	hasPermission(cb: HasPermission<Inst>): this {
		this.permissionRes = cb;
		return this;
	}

	async handle<Type extends keyof CommandInteractionHandlers<Inst>>(type: Type, bot: Inst, int: Interaction): Promise<InteractionResponse | void> {
		if (this.handlers[type]) {
			return this.handlers[type](bot, int as any);
		}
	}
}
