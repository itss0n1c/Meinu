/* eslint-disable no-unused-vars */
import { ApplicationCommandOptionData, ApplicationCommandType, Collection, CommandInteraction, Interaction, Message, MessageActionRow, MessageActionRowComponent, MessageButton, MessageButtonOptions, MessageEmbed, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';

import { promisify } from 'util';
import Meinu from '.';


// eslint-disable-next-line no-unused-vars
export type CommandRes<T> = (bot: T, interaction: CommandInteraction) => string | MessageEmbed | Promise<string> | Promise<MessageEmbed> | void | Promise<void>

// eslint-disable-next-line no-unused-vars
export type interactionHandler<T> = (bot: T, interaction: Interaction, msg: Message) => void

export interface CommandInfoBasics {
	name: string
	description: string
}

export interface CommandInfoMessage extends CommandInfoBasics {
	type: 'MESSAGE'
}

export interface CommandInfoUser extends CommandInfoBasics {
	type: 'USER'
}

export interface CommandInfoChat extends CommandInfoBasics {
	type?: 'CHAT_INPUT'
	options?: ApplicationCommandOptionData[]
	buttons?: MessageButtonOptions[]
	selectmenu?: MessageSelectMenuOptions[]

}

export type CommandInfo = CommandInfoMessage | CommandInfoUser | CommandInfoChat;

export class Command<T = Meinu> {
	name: string
	description: string
	options?: ApplicationCommandOptionData[]
	type?: ApplicationCommandType
	components: MessageActionRowComponent[]
	buttons?: MessageButtonOptions[]
	selectmenu?: MessageSelectMenuOptions[]
	row: MessageActionRow
	handler: interactionHandler<T>
	response: CommandRes<T>
	interactions = new Collection<string, CommandInteraction>()

	constructor(opts: CommandInfo) {
		this.name = opts.name;
		this.description = opts.description;
		if (typeof opts.type === 'undefined') {
			opts.type = 'CHAT_INPUT';
		}
		this.type = opts.type;
		if (opts.type === 'CHAT_INPUT') {
			this.options = opts.options || [];
			this.buttons = opts.buttons || [];
			this.selectmenu = opts.selectmenu || [];
			this.row = new MessageActionRow();
			this.initComponents();
			this.row.components = this.components;
		}
	}

	commandInfo(): CommandInfo {
		return { name: this.name,
			description: this.description,
			type: this.type,
			options: this.options };
	}

	private initComponents(): void {
		if (this.buttons.length > 0 || this.selectmenu.length > 0) {
			this.components = [];
			for (const button of this.buttons) {
				this.components.push(new MessageButton(button));
			}
			for (const menu of this.selectmenu) {
				this.components.push(new MessageSelectMenu(menu));
			}
		}
	}

	interactionHandler(cb: interactionHandler<T>): this {
		this.handler = cb;
		return this;
	}

	async handleInteraction(bot: T, interaction: Interaction, msg: Message): Promise<void> {
		return this.handler(bot, interaction, msg);
	}

	run(cb: CommandRes<T>): this {
		this.response = cb;
		return this;
	}

	async handle(bot: T, interaction: CommandInteraction): Promise<string | MessageEmbed | void> {
		this.interactions.set(interaction.id, interaction);
		return this.response(bot, interaction);
	}

	wait = promisify(setTimeout);
}

export class Commands extends Collection<string, Command> {}
