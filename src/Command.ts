import { ApplicationCommandOptionData, ApplicationCommandType, Collection, CommandInteraction, Interaction, Message, MessageActionRow, MessageActionRowComponent, MessageButton, MessageButtonOptions, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';
import { Meinu } from '.';
import { promisify } from 'util';


export type CommandRes = (bot: Meinu, interaction: CommandInteraction) => string | Promise<string>

export type interactionHandler = (bot: Meinu, interaction: Interaction, msg: Message) => void


export interface CommandInfo {
	name: string
	cmd_type?: 'CONTEXT' | 'SLASH'
	description: string
	options?: ApplicationCommandOptionData[]
	type?: ApplicationCommandType
	buttons?: MessageButtonOptions[]
	selectmenu?: MessageSelectMenuOptions[]
}

export class Command implements CommandInfo {
	name: string
	cmd_type?: 'CONTEXT' | 'SLASH'
	description: string
	options?: ApplicationCommandOptionData[]
	type?: ApplicationCommandType
	components: MessageActionRowComponent[]
	buttons?: MessageButtonOptions[]
	selectmenu?: MessageSelectMenuOptions[]
	row: MessageActionRow
	handler: interactionHandler
	private response: CommandRes

	constructor(opts: CommandInfo) {
		this.name = opts.name;
		this.description = opts.description;
		this.options = opts.options || [];
		this.type = opts.type || 'CHAT_INPUT';
		this.cmd_type = opts.cmd_type || 'SLASH';
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

	async interactionHandler(cb: interactionHandler): Promise<void> {
		this.handler = cb;
	}

	async handleInteraction(bot: Meinu, interaction: Interaction, msg: Message): Promise<void> {
		return this.handler(bot, interaction, msg);
	}

	run(cb: CommandRes): void {
		this.response = cb;
	}

	async handle(bot: Meinu, interaction: CommandInteraction): Promise<string> {
		return this.response(bot, interaction);
	}

	wait = promisify(setTimeout);
}

export class Commands extends Collection<string, Command> {}
