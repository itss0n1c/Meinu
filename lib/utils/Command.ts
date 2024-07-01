/* eslint-disable no-unused-vars */
import {
	type AnySelectMenuInteraction,
	type ApplicationCommandOptionData,
	ApplicationCommandOptionType,
	type ApplicationCommandSubCommandData,
	ApplicationCommandType,
	type AutocompleteInteraction,
	type ButtonInteraction,
	type ChatInputCommandInteraction,
	type Interaction,
	type InteractionResponse,
	type Message,
	type MessageContextMenuCommandInteraction,
	type ModalSubmitInteraction,
	type UserContextMenuCommandInteraction,
} from 'discord.js';
import type { Meinu } from '../index.js';
import { Locales, type PartialLocales, setLocales } from './Locales.js';

type CommandResponse = void | Promise<InteractionResponse | void | Message>;

export interface CommandInteractionHandlers<Inst> {
	chatInput: (bot: Inst, int: ChatInputCommandInteraction) => CommandResponse;
	button: (bot: Inst, int: ButtonInteraction) => CommandResponse;
	modalSubmit: (bot: Inst, int: ModalSubmitInteraction) => CommandResponse;
	selectMenu: (bot: Inst, int: AnySelectMenuInteraction) => CommandResponse;
	userContextMenu: (bot: Inst, int: UserContextMenuCommandInteraction) => CommandResponse;
	messageContextMenu: (bot: Inst, int: MessageContextMenuCommandInteraction) => CommandResponse;
	autocomplete: (bot: Inst, int: AutocompleteInteraction) => CommandResponse;
}

type handler<Inst, T extends keyof CommandInteractionHandlers<Inst>> = Partial<{
	[K in T]: CommandInteractionHandlers<Inst>[K];
}>;

export enum CommandIntegrationType {
	GUILD_INSTALL = 0,
	USER_INSTALL = 1,
}

export enum CommandContext {
	GUILD = 0,
	BOT_DM = 1,
	PRIVATE_CHANNEL = 2,
}

interface CommandInfoBasics {
	name: string | Locales;
	ownersOnly?: boolean;
	nsfw?: boolean;
	integration_types?: CommandIntegrationType[];
	contexts?: CommandContext[];
}

interface CommandInfoMessage extends CommandInfoBasics {
	type: ApplicationCommandType.Message;
}

interface CommandInfoUser extends CommandInfoBasics {
	type: ApplicationCommandType.User;
}

interface CommandInfoChat extends CommandInfoBasics {
	type?: ApplicationCommandType.ChatInput;
	description: string | Locales;
	options?: ApplicationCommandOptionData[];
}

export type CommandInfo = CommandInfoChat | CommandInfoMessage | CommandInfoUser;

export type CommandInfoExport = CommandInfo & {
	name: string;
	nameLocalizations: PartialLocales;
	description: string;
	descriptionLocalizations: PartialLocales;
	nsfw: boolean;
	integration_types: CommandIntegrationType[];
	contexts: CommandContext[];
};

// eslint-disable-next-line no-unused-vars
type HasPermission<Inst = Meinu> = (bot: Inst, int: Interaction) => Promise<boolean>;

interface SubCommandGroup<T> {
	name: string | Locales;
	description: string | Locales;
	commands: T[];
}

export class Command<Inst = Meinu> {
	name: Locales;
	description: Locales;
	type: CommandInfo['type'];
	integration_types: CommandIntegrationType[];
	contexts: CommandContext[];
	options: ApplicationCommandOptionData[] = [];
	// eslint-disable-next-line no-use-before-define
	subcommands: Command<Inst>[] = [];
	private handlers: handler<Inst, keyof CommandInteractionHandlers<Inst>> = {};
	permissionRes: HasPermission<Inst>;
	ownersOnly: boolean;
	global: boolean;
	nsfw: boolean;

	constructor(info: CommandInfo & { global?: boolean }) {
		this.name = info.name instanceof Locales ? info.name : setLocales({ default: info.name });
		this.ownersOnly = info.ownersOnly ?? false;
		info.type = info.type ?? ApplicationCommandType.ChatInput;
		this.type = info.type;
		if (info.type === ApplicationCommandType.ChatInput) {
			this.description =
				info.description instanceof Locales ? info.description : setLocales({ default: info.description });
			this.options = info.options ?? [];
		} else {
			this.description = setLocales({ default: '' });
		}
		this.integration_types = info.integration_types ?? [CommandIntegrationType.GUILD_INSTALL];
		this.contexts = info.contexts ?? [CommandContext.GUILD];
		this.permissionRes = () => Promise.resolve(true);
		this.global = info.global ?? false;
		this.nsfw = info.nsfw ?? false;
	}

	addSubCommandGroup(group: SubCommandGroup<Command<Inst>>): this {
		const opts: Partial<ApplicationCommandOptionData> = {
			type: ApplicationCommandOptionType.SubcommandGroup,
			options: group.commands.map((c) => {
				const opts: Partial<ApplicationCommandSubCommandData> = {
					type: ApplicationCommandOptionType.Subcommand,
				};
				opts.name = c.name.get('default');
				if (c.description instanceof Locales) {
					opts.description = c.description.get('default');
					if (c.description.size > 1) opts.descriptionLocalizations = c.description.toJSON();
				}
				if (c.name.size > 1) opts.nameLocalizations = c.name.toJSON();
				if (c.options.length > 0) opts.options = c.options as ApplicationCommandSubCommandData['options'];
				return opts as ApplicationCommandSubCommandData;
			}),
		};
		if (group.name instanceof Locales) {
			opts.name = group.name.get('default');
			if (group.name.size > 1) opts.nameLocalizations = group.name.toJSON();
		} else opts.name = group.name;

		if (group.description instanceof Locales) {
			opts.description = group.description.get('default');
			if (group.description.size > 1) opts.descriptionLocalizations = group.description.toJSON();
		} else opts.description = group.description;

		this.options.push(opts as ApplicationCommandOptionData);

		for (const cmd of group.commands) {
			cmd.name.set('default', `${group.name} ${cmd.name.get('default')}`);
			this.subcommands.push(cmd);
		}

		return this;
	}

	addSubCommands(cmds: Command<Inst>[]): this {
		this.subcommands.push(...cmds);
		for (const cmd of cmds) {
			const opts: Partial<ApplicationCommandOptionData> = {
				type: ApplicationCommandOptionType.Subcommand,
			};
			if (cmd.options.length > 0) opts.options = cmd.options as ApplicationCommandSubCommandData['options'];
			opts.name = cmd.name.get('default');
			opts.description = cmd.description.get('default');
			if (cmd.name.size > 1) opts.nameLocalizations = cmd.name.toJSON();
			if (cmd.description.size > 1) opts.descriptionLocalizations = cmd.description.toJSON();
			this.options.push(opts as ApplicationCommandOptionData);
		}
		return this;
	}

	commandInfo(): CommandInfoExport {
		const res: Partial<CommandInfoExport> = {
			type: this.type,
		};
		res.name = this.name.get('default');
		res.description = this.description.get('default');
		if (this.description.size > 1) res.descriptionLocalizations = this.description.toJSON();
		if (this.name.size > 1) res.nameLocalizations = this.name.toJSON();
		if (this.description && this.description.size > 1) res.descriptionLocalizations = this.description.toJSON();
		if (res.type === ApplicationCommandType.ChatInput) if (this.options.length > 0) res.options = this.options;
		if (this.nsfw) res.nsfw = true;
		res.integration_types = this.integration_types;
		res.contexts = this.contexts;
		return res as CommandInfoExport;
	}

	addHandler<T extends keyof CommandInteractionHandlers<Inst>>(
		type: T,
		handler: CommandInteractionHandlers<Inst>[T],
	): this {
		this.handlers[type] = handler;
		return this;
	}

	hasPermission(cb: HasPermission<Inst>): this {
		this.permissionRes = cb;
		return this;
	}

	async handle<Type extends keyof CommandInteractionHandlers<Inst>>(
		type: Type,
		bot: Inst,
		int: Interaction,
	): Promise<Message | InteractionResponse | void> {
		if (this.handlers[type])
			return (this.handlers[type] as CommandInteractionHandlers<Inst>[Type])(bot, int as any);
	}
}
