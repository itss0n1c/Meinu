import { Client, Collection, ColorResolvable, GatewayIntentBits, Guild, Partials } from 'discord.js';
import { config } from 'dotenv';
import { Command, InteractionHandler } from './utils/index.js';

export interface MeinuOptions {
	color: ColorResolvable;
	name: string;
	owners: string[];
	guildCommands: Command[];
	globalCommands: Command[];
	specificGuildId: string;
	fullIntents: boolean;
}

class Meinu {
	name: string;
	color: ColorResolvable;
	client: Client;
	guildCommands: Collection<string, Command>;
	globalCommands: Collection<string, Command>;
	specificGuildId: string | undefined;
	owners: string[];
	handler: InteractionHandler | undefined;
	fullIntents: boolean;

	constructor(opts: Partial<MeinuOptions>) {
		this.name = opts.name ?? 'Meinu';
		this.color = opts.color ?? '#007aff';
		this.owners = opts.owners ?? [];
		if (opts.specificGuildId) {
			this.specificGuildId = opts.specificGuildId;
		}
		this.fullIntents = opts.fullIntents ?? false;
		opts.fullIntents = this.fullIntents;

		this.guildCommands = new Collection<string, Command>((opts.guildCommands ?? []).map((cmd) => [ cmd.name.default, cmd ]));
		this.globalCommands = new Collection<string, Command>((opts.globalCommands ?? []).map((cmd) => [ cmd.name.default, cmd ]));

		if (opts.fullIntents) {
			this.client = new Client({
				intents: [
					GatewayIntentBits.Guilds,
					GatewayIntentBits.GuildMembers,
					GatewayIntentBits.GuildBans,
					GatewayIntentBits.GuildEmojisAndStickers,
					GatewayIntentBits.GuildIntegrations,
					GatewayIntentBits.GuildWebhooks,
					GatewayIntentBits.GuildInvites,
					GatewayIntentBits.GuildVoiceStates,
					GatewayIntentBits.GuildPresences,
					GatewayIntentBits.GuildMessages,
					GatewayIntentBits.GuildMessageReactions,
					GatewayIntentBits.GuildMessageTyping,
					GatewayIntentBits.DirectMessages,
					GatewayIntentBits.DirectMessageReactions,
					GatewayIntentBits.DirectMessageTyping,
					GatewayIntentBits.MessageContent,
					GatewayIntentBits.GuildScheduledEvents,
					GatewayIntentBits.AutoModerationConfiguration,
					GatewayIntentBits.AutoModerationExecution
				],
				partials: [ Partials.Channel ]
			});
		} else {
			this.client = new Client({ intents: [ GatewayIntentBits.Guilds ] });
		}

		this.handler = undefined;
	}

	get guild(): Guild | undefined {
		return this.client.guilds.cache.get(this.specificGuildId ?? '');
	}

	findCommand(cmd: string): Command | null {
		let command = this.globalCommands.get(cmd);
		if (!command) {
			command = this.guildCommands.get(cmd);
			if (!command) {
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
			await this.registerGuildCommands(this.guild as Guild);
		} else {
			await this.registerAllGuildCommands();
		}
	}

	private async registerGlobalCommands(): Promise<void> {
		if (!this.client.application) {
			throw new Error('Client application is not defined');
		}
		await this.client.application.commands.fetch({
			withLocalizations: true
		});
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
		await guild.commands.fetch({
			withLocalizations: true
		});

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

	async init(_token?: string): Promise<this> {
		config();
		if (typeof process.env.TOKEN === 'undefined' && typeof _token === 'undefined') {
			throw 'Token not defined.';
		}

		await this.client.login(_token ?? process.env.TOKEN);

		await new Promise((res) => this.client.once('ready', res));

		if (!this.client.user) {
			throw new Error('Client user is not defined');
		}

		await this.initCommands();

		this.handler = new InteractionHandler(this);
		console.log(`Logged in as ${this.client.user.tag}!`);
		return this;
	}
}

export * from 'discord.js';
export * from './cmds/index.js';
export * from './utils/index.js';
export { Meinu };
