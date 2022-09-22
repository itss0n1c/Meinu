import { Client, Collection, ColorResolvable, GatewayIntentBits, Guild } from 'discord.js';
import { config } from 'dotenv';
import { Command } from './Command.js';
import { InteractionHandler } from './InteractionHandler.js';

export interface MeinuOptions {
	color: ColorResolvable;
	name: string;
	owners: string[];
	guildCommands: Command[];
	globalCommands: Command[];
	specificGuildId: string;
	fullIntents: boolean;
	token: string;
}

class Meinu {
	name: string;
	color: ColorResolvable;
	client: Client;
	guildCommands: Collection<string, Command>;
	globalCommands: Collection<string, Command>;
	specificGuildId: string;
	owners: string[];
	handler: InteractionHandler;
	fullIntents: boolean;

	async create(opts: Partial<MeinuOptions>): Promise<this> {
		this.name = opts.name ?? 'Meinu';
		this.color = opts.color ?? '#007aff';
		this.owners = opts.owners ?? [];
		if (opts.specificGuildId) {
			this.specificGuildId = opts.specificGuildId;
		}
		this.fullIntents = opts.fullIntents ?? false;
		opts.fullIntents = this.fullIntents;

		this.guildCommands = new Collection<string, Command>((opts.guildCommands ?? []).map((cmd) => [ cmd.name.get('default'), cmd ]));
		this.globalCommands = new Collection<string, Command>((opts.globalCommands ?? []).map((cmd) => [ cmd.name.get('default'), cmd ]));

		return this.init(opts);
	}

	get guild(): Guild {
		return this.client.guilds.cache.get(this.specificGuildId);
	}

	findCommand(cmd: string): Command {
		let command = this.globalCommands.get(cmd);
		if (typeof command === 'undefined') {
			command = this.guildCommands.get(cmd);
			if (typeof command === 'undefined') {
				return null;
			}
			return command;
		}
		return command;
	}

	private async initCommands(): Promise<void> {
		console.log('Loading global commands...');
		await this.registerGlobalCommands();

		console.log('Loading guild commands...');
		if (this.specificGuildId) {
			await this.registerGuildCommands(this.client.guilds.cache.get(this.specificGuildId));
		} else {
			await this.registerAllGuildCommands();
		}
	}

	private async registerGlobalCommands(): Promise<void> {
		await this.client.application.commands.fetch();
		const globalCmds = this.client.application.commands;

		for (const cmd of globalCmds.cache.values()) {
			if (!this.globalCommands.has(cmd.name)) {
				console.log(`Removing global command ${cmd.name}`);
				await cmd.delete();
			}
		}
		console.time('global commands');
		for (const c of this.globalCommands.values()) {
			const find = globalCmds.cache.find((cmd) => cmd.name === c.name.get('default'));
			if (!find) {
				console.log(`Registering global command ${c.name.get('default')}`);
				await globalCmds.create(c.commandInfo());
			} else {
				const shouldUpdate = !find.equals(c.commandInfo());
				console.log(c.name.get('default'), shouldUpdate);
				if (shouldUpdate) {
					await globalCmds.edit(find, c.commandInfo());
				}
			}
		}
		console.timeEnd('global commands');
	}

	private async registerAllGuildCommands(): Promise<void> {
		await Promise.allSettled(this.client.guilds.cache.map((g) => this.registerGuildCommands(g)));
	}

	private async registerGuildCommands(guild: Guild): Promise<void> {
		await guild.commands.fetch();

		for (const cmd of guild.commands.cache.values()) {
			if (!this.guildCommands.has(cmd.name)) {
				console.log(`Removing guild command ${cmd.name} from ${guild.name}`);
				await cmd.delete();
			}
		}

		console.time(`guild commands ${guild.name}`);
		for (const c of this.guildCommands.values()) {
			const find = guild.commands.cache.find((cmd) => cmd.name === c.name.get('default'));
			if (!find) {
				console.log(`Registering guild command ${c.name.get('default')} in ${guild.name}`);
				await guild.commands.create(c.commandInfo());
			} else {
				const shouldUpdate = !find.equals(c.commandInfo());
				console.log(c.name.get('default'), shouldUpdate);
				if (shouldUpdate) {
					await guild.commands.edit(find, c.commandInfo());
				}
			}
		}
		console.timeEnd(`guild commands ${guild.name}`);
	}

	private async init(opts: Partial<MeinuOptions>): Promise<this> {
		config();

		if (opts.fullIntents) {
			this.client = new Client({
				intents: [
					GatewayIntentBits.DirectMessageReactions,
					GatewayIntentBits.DirectMessageTyping,
					GatewayIntentBits.DirectMessages,
					GatewayIntentBits.GuildBans,
					GatewayIntentBits.GuildEmojisAndStickers,
					GatewayIntentBits.GuildIntegrations,
					GatewayIntentBits.GuildInvites,
					GatewayIntentBits.GuildMembers,
					GatewayIntentBits.GuildMessageReactions,
					GatewayIntentBits.GuildMessageTyping,
					GatewayIntentBits.GuildMessages,
					GatewayIntentBits.GuildPresences,
					GatewayIntentBits.GuildScheduledEvents,
					GatewayIntentBits.GuildVoiceStates,
					GatewayIntentBits.GuildWebhooks,
					GatewayIntentBits.Guilds,
					GatewayIntentBits.MessageContent
				]
			});
		} else {
			this.client = new Client({ intents: [ GatewayIntentBits.Guilds ] });
		}

		if (typeof process.env.TOKEN === 'undefined' && typeof opts.token === 'undefined') {
			throw 'Token not defined.';
		}

		await this.client.login(process.env.TOKEN ?? opts.token);

		await new Promise((res) => this.client.once('ready', res));

		await this.initCommands();

		this.handler = await InteractionHandler.create(this);
		console.log(`Logged in as ${this.client.user.tag}!`);
		return this;
	}
}

export * from 'discord.js';
export * from './cmds/index.js';
export * from './Locales.js';
export { Meinu, Command };
