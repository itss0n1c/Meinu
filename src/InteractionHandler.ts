import { ButtonInteraction, CommandInteraction, ContextMenuInteraction, Message, MessageActionRow, MessageEmbed, SelectMenuInteraction } from 'discord.js';

import { Meinu } from '.';

export class InteractionHandler {
	private inst: Meinu
	constructor(inst: Meinu) {
		Object.defineProperty(this, 'inst', {
			value: inst,
			writable: true,
			configurable: true
		});
		this.init();
	}

	async replyInt(res: string | MessageEmbed, interaction: CommandInteraction): Promise<void> {
		const embed = new MessageEmbed();
		embed.setAuthor('Meinu', this.inst.client.user.displayAvatarURL({
			dynamic: true,
			format: 'png'
		}))
			.setFooter(interaction.user.tag, interaction.user.displayAvatarURL({
				dynamic: true,
				format: 'png'
			}))
			.setTimestamp(new Date());

		if (typeof res === 'string') {
			embed.setDescription(res);
		} else {
			embed.description = res.description || null;
			embed.fields = res.fields || [];
			embed.thumbnail = res.thumbnail;
		}

		const cmd = await this.inst.findCommand(interaction.command.name);
		let components: MessageActionRow[] = [];
		if (typeof cmd.components !== 'undefined') {
			components = [ cmd.row ];
		}

		return interaction.reply({ embeds: [ embed ],
			components });
	}

	async handleButton(int: ButtonInteraction): Promise<void> {
		const msg_int = int.message.interaction;
		if (msg_int.type === 'APPLICATION_COMMAND') {
			const cmd = await this.inst.findCommand(msg_int.commandName);
			return cmd.handleInteraction(this.inst, int, int.message as Message);
		}
	}

	async handleCommand(int: CommandInteraction): Promise<void> {
		const cmdname = int.commandName;
		if (this.inst.commands.has(cmdname)) {
			const cmd = this.inst.commands.get(cmdname);
			const res = await cmd.handle(this.inst, int);
			return this.replyInt(res, int);
		}
	}

	async handleContextMenu(int: ContextMenuInteraction): Promise<void> {
		const message = int.channel.messages.cache.get(int.targetId);
		const cmd = await this.inst.findCommand(int.command.name);
		return cmd.handleInteraction(this.inst, int, message);
	}

	async handleSelectMenu(int: SelectMenuInteraction): Promise<void> {
		const msg_int = int.message.interaction;
		if (msg_int.user.id !== int.user.id) {
			return;
		}
		if (msg_int.type === 'APPLICATION_COMMAND') {
			const cmd = await this.inst.findCommand(msg_int.commandName);
			return cmd.handleInteraction(this.inst, int, int.message as Message);
		}
	}

	async init(): Promise<void> {
		this.inst.client.on('interactionCreate', async interaction => {
			if (interaction.isButton()) {
				return this.handleButton(interaction);
			}
			if (interaction.isCommand()) {
				return this.handleCommand(interaction);
			}
			if (interaction.isContextMenu()) {
				return this.handleContextMenu(interaction);
			}
			if (interaction.isSelectMenu()) {
				return this.handleSelectMenu(interaction);
			}
		});
	}
}
