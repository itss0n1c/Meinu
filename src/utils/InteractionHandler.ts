import {
	ApplicationCommandOptionType,
	ApplicationCommandSubCommandData,
	ApplicationCommandSubGroupData,
	Interaction,
	InteractionResponse,
	InteractionType,
	Message
} from 'discord.js';
import { Meinu } from '../index.js';
import { Command, CommandInteractionHandlers } from './Command.js';

export class InteractionHandler {
	inst: Meinu;

	constructor(inst: Meinu) {
		this.inst = inst;

		this.inst.on('interactionCreate', async (interaction) => {
			try {
				await this.matchInteraction(interaction);
			} catch {}
		});
	}

	private async matchInteraction(interaction: Interaction) {
		try {
			switch (interaction.type) {
				case InteractionType.ApplicationCommandAutocomplete:
					await this.handleInteraction('autocomplete', interaction);
					break;
				case InteractionType.ModalSubmit:
					await this.handleInteraction('modalSubmit', interaction);
					break;
				case InteractionType.MessageComponent:
					if (interaction.isButton()) {
						await this.handleInteraction('button', interaction);
					}
					if (interaction.isAnySelectMenu()) {
						await this.handleInteraction('selectMenu', interaction);
					}
					break;
				case InteractionType.ApplicationCommand:
					if (interaction.isChatInputCommand()) {
						await this.handleInteraction('chatInput', interaction);
					}
					if (interaction.isMessageContextMenuCommand()) {
						await this.handleInteraction('messageContextMenu', interaction);
					}
					if (interaction.isUserContextMenuCommand()) {
						await this.handleInteraction('userContextMenu', interaction);
					}
					break;
			}
		} catch (e) {
			console.error(e);
			if (interaction.isRepliable()) {
				if (interaction.replied) {
					return interaction.editReply({
						content: e instanceof Error ? e.message : 'An error occured while executing the command.'
					});
				}
				return interaction.reply({
					content: e instanceof Error ? e.message : 'An error occured while executing the command.',
					ephemeral: true
				});
			}
		}
	}

	resolveCommand(int: Interaction): Command[] {
		const cmds: Command[] = [];
		if (int.isCommand() || int.type === InteractionType.ApplicationCommandAutocomplete || int.isContextMenuCommand()) {
			const main = this.inst.findCommand(int.commandName);
			if (!main) {
				throw new Error('Command not found.');
			}
			cmds.push(main);
			if (int.isChatInputCommand() || int.type === InteractionType.ApplicationCommandAutocomplete) {
				try {
					const group = int.options.getSubcommandGroup();
					const sub = int.options.getSubcommand();
					let cmd: Command | undefined;
					if (group) {
						const group_cmds = main.subcommands.filter((c) => c.name.default.startsWith(group));
						if (!group_cmds.length) {
							throw 404;
						}
						cmd = group_cmds.find((c) => c.name.default === `${group} ${sub}`);
						if (!cmd) {
							throw 404;
						}
					} else if (sub) {
						cmd = main.subcommands.find((c) => c.name.default === sub);
						if (!cmd) {
							throw 404;
						}
					}
					if (!cmd) {
						throw 404;
					}
					cmds.push(cmd);
				} catch (e) {}
			}
		}
		if (int.isMessageComponent()) {
			const msg_int = int.message.interaction;

			if (msg_int) {
				if (msg_int.type === InteractionType.ApplicationCommand) {
					let maincmd = this.inst.findCommand(msg_int.commandName);
					// console.log(msg_int);

					if (!maincmd) {
						const [ parent, ...sub ] = msg_int.commandName.split(' ');

						console.log({ parent,
							sub,
							name: msg_int.commandName });
						maincmd = this.inst.findCommand(parent);
						if (!maincmd) {
							throw new Error('Command not found.');
						}
						cmds.push(maincmd);

						if (sub.length > 0) {
							const subs = maincmd.options.filter(
								(o) => o.type === ApplicationCommandOptionType.SubcommandGroup || o.type === ApplicationCommandOptionType.Subcommand
							) as Array<ApplicationCommandSubCommandData | ApplicationCommandSubGroupData>;
							// circulate through subcommands
							const circular_sub = (maincmd: Command) => {
								let found: Command | undefined;
								for (const s of subs) {
									if (s.name === sub[0]) {
										if (s.type === ApplicationCommandOptionType.SubcommandGroup) {
											const find = s.options?.find((o) => o.name === sub[1]);
											if (find) {
												const subcmd = maincmd.subcommands.find((c) => c.name.get('default') === `${s.name} ${find.name}`);
												if (subcmd) {
													cmds.push(subcmd);
													found = subcmd;
												}
											}
										} else {
											const subcmd = maincmd.subcommands.find((c) => c.name.get('default') === s.name);
											if (subcmd) {
												cmds.push(subcmd);
												found = subcmd;
											}
										}
									}
								}
								return found;
							};

							const found = circular_sub(maincmd);
							if (!found) {
								throw new Error('Command not found.');
							}
							cmds.push(found);
						}
					} else {
						cmds.push(maincmd);
					}
				}
			} else {
				cmds.push(...this.resolve_cmd_path(int.customId));
			}
		}

		if (int.isModalSubmit()) {
			cmds.push(...this.resolve_cmd_path(int.customId));
		}
		return cmds;
	}

	private resolve_cmd_path(custom_id: string): Command[] {
		const cmds: Command[] = [];
		const split = custom_id.split('-');
		split.splice(split.length - 1, 1);
		const [ cmdname, ...rest ] = split;
		console.log({
			cmdname,
			rest,
			custom_id
		});

		const cmd = this.inst.findCommand(cmdname);
		if (!cmd) {
			throw new Error('Command not found.');
		}
		cmds.push(cmd);
		if (rest.length > 0) {
			const subcmd = cmd.subcommands.find((c) => c.name.get('default') === rest.join(' '));
			if (subcmd) {
				cmds.push(subcmd);
			}
		}

		console.log(
			'resolve_cmd_path',
			cmds.map((c) => c.name)
		);
		return cmds;
	}

	private async asyncBool(promise: Promise<boolean>): Promise<boolean> {
		let res: boolean;
		try {
			res = await promise;
		} catch (e) {
			res = false;
		}
		console.log(res);
		return res;
	}

	async cmdPermissionHandler(cmd: Command, int: Interaction): Promise<boolean> {
		console.log(`testing permission for ${cmd.name.get('default')} for interaction ${int.id} by ${int.user.tag}`);

		if (this.inst.owners.includes(int.user.id)) {
			return true;
		}
		if (cmd.ownersOnly) {
			return false;
		}

		if (typeof cmd.permissionRes !== 'undefined') {
			return this.asyncBool(cmd.permissionRes(this.inst, int));
		}

		return true;
	}

	async handleInteraction(type: keyof CommandInteractionHandlers<Meinu>, int: Interaction): Promise<Message | InteractionResponse | void> {
		const cmds = this.resolveCommand(int);
		if (cmds.length > 0) {
			const maincmd = cmds[0];

			if (!(await this.cmdPermissionHandler(maincmd, int))) {
				throw new Error('You do not have permission to use this command.');
			}
			if (cmds.length > 1) {
				const subcmd = cmds[1];
				if (!(await this.cmdPermissionHandler(subcmd, int))) {
					throw new Error('You do not have permission to use this command.');
				}
				return subcmd.handle(type, this.inst, int);
			}
			return maincmd.handle(type, this.inst, int);
		}
	}
}
