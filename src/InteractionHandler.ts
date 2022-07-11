import {
	AutocompleteInteraction,
	ButtonInteraction,
	CommandInteraction,
	ContextMenuInteraction,
	Message,
	MessageEmbed,
	SelectMenuInteraction,
	TextChannel
} from 'discord.js';

import { Command, Meinu } from '.';

export class InteractionHandler {
	private inst: Meinu;
	constructor(inst: Meinu) {
		Object.defineProperty(this, 'inst', {
			value: inst,
			writable: true,
			configurable: true
		});
		this.init();
	}

	async replyInt(res: string | MessageEmbed, interaction: CommandInteraction, error = false): Promise<void> {
		let embed: MessageEmbed;

		if (error) {
			embed = new MessageEmbed();
			embed.setColor('RED');
			embed.setDescription(`Oh no!\n${res}\n`);
		} else {
			if (typeof res === 'string') {
				embed = new MessageEmbed();
				embed.setDescription(res);
			} else {
				embed = res;
			}
			embed.setColor(this.inst.color);
		}

		embed.setTimestamp(new Date());

		embed.footer = {
			text: interaction.user.tag,
			iconURL: interaction.user.displayAvatarURL({
				dynamic: true,
				format: 'png'
			})
		};

		return interaction.reply({ embeds: [ embed ] });
	}

	async handleAutocomplete(int: AutocompleteInteraction): Promise<void> {
		const cmd = await this.inst.findCommand(int.commandName);
		return cmd.handleInteraction(this.inst, int);
	}

	async handleButton(int: ButtonInteraction): Promise<void> {
		const msg_int = int.message.interaction;
		if (msg_int.type === 'APPLICATION_COMMAND') {
			const cmd = await this.inst.findCommand(msg_int.commandName);
			return cmd.handleInteraction(this.inst, int, int.message as Message);
		}
	}

	private commandHasSub(int: CommandInteraction): boolean {
		try {
			int.options.getSubcommand();
		} catch (e) {
			return false;
		}
		return true;
	}

	async handleCommand(int: CommandInteraction): Promise<void> {
		const cmdname = int.commandName;
		if (this.inst.commands.has(cmdname)) {
			const cmd = this.inst.commands.get(cmdname);

			if (this.commandHasSub(int)) {
				const subname = int.options.getSubcommand();
				const subcmd = cmd.subcommands.find((c) => c.name === subname);
				return this.handleCmdRes(subcmd, int);
			}
			return this.handleCmdRes(cmd, int);
		}
	}

	async handleCmdRes(cmd: Command, int: CommandInteraction): Promise<void> {
		let res: string | MessageEmbed | void;
		try {
			res = await cmd.handle(this.inst, int);
		} catch (e) {
			console.error(e);
			return this.replyInt(e, int, true);
		}
		if (typeof res !== 'undefined') {
			return this.replyInt(res, int);
		}
	}

	async handleContextMenu(int: ContextMenuInteraction): Promise<void> {
		const channel = (await int.guild.channels.fetch(int.channelId)) as TextChannel;
		const message = channel.messages.cache.get(int.targetId);
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
		this.inst.client.on('interactionCreate', async (interaction) => {
			if (interaction.isAutocomplete()) {
				return this.handleAutocomplete(interaction);
			}

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
