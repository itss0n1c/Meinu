/* eslint-disable no-unused-vars */
import { ApplicationCommandOptionData, ApplicationCommandType, Collection, CommandInteraction, Interaction, Message, MessageActionRow, MessageActionRowComponent, MessageButton, MessageButtonOptions, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';

import { promisify } from 'util';
import Meinu from '.';


export interface CommandInfo {
	name: string
	description: string
	options?: ApplicationCommandOptionData[]
	type?: ApplicationCommandType
	buttons?: MessageButtonOptions[]
	selectmenu?: MessageSelectMenuOptions[]
}

export class Command<T = Meinu> implements CommandInfo {
	name: string
	description: string
	options?: ApplicationCommandOptionData[]
	type?: ApplicationCommandType
	components: MessageActionRowComponent[]
	buttons?: MessageButtonOptions[]
	selectmenu?: MessageSelectMenuOptions[]
	row: MessageActionRow
	handler: (bot: T, interaction: Interaction, msg: Message) => void
	response: (bot: T, interaction: CommandInteraction) => string | Promise<string>

	constructor(opts: CommandInfo) {
		this.name = opts.name;
		this.description = opts.description;
		this.options = opts.options || [];
		this.type = opts.type || 'CHAT_INPUT';
		this.buttons = opts.buttons || [];
		this.selectmenu = opts.selectmenu || [];
		this.initComponents();
		this.row = new MessageActionRow();
		this.row.components = this.components;
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

	async interactionHandler(cb: (bot: T, interaction: Interaction, msg: Message) => void): Promise<void> {
		this.handler = cb;
	}

	async handleInteraction(bot: T, interaction: Interaction, msg: Message): Promise<void> {
		return this.handler(bot, interaction, msg);
	}

	run(cb: (bot: T, interaction: CommandInteraction) => string | Promise<string>): void {
		this.response = cb;
	}

	async handle(bot: T, interaction: CommandInteraction): Promise<string> {
		return this.response(bot, interaction);
	}

	wait = promisify(setTimeout);
}

export class Commands extends Collection<string, Command> {}
