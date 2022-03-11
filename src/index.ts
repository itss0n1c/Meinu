import { ApplicationCommandOption, ApplicationCommandOptionData, Client, ColorResolvable, Guild, Intents } from 'discord.js';
import { Command, Commands } from './Command';
import ScrollEmbed from './ScrollEmbed';
import { config } from 'dotenv';
import { defaultCommands } from './cmds';
import { InteractionHandler } from './InteractionHandler';

export interface MeinuOptionsBasics {
	color: ColorResolvable
	name: string
	owners: string[]
	cmds: Command[]
	fullIntents: boolean
	token: string
	registerDefaults: boolean
}

export interface MeinuOptionsPublic extends MeinuOptionsBasics {
	testing: false
}

export interface MeinuOptionsTesting extends MeinuOptionsBasics {
	testing: true
	testingGuild: string
}

export type MeinuOptions = MeinuOptionsPublic | MeinuOptionsTesting;

class Meinu {
	name: string
	color: ColorResolvable
	client: Client
	commands = new Commands()
	testing:boolean
	owners: string[]
	handler: InteractionHandler
	testingGuild: Guild
	fullIntents: boolean

	constructor(opts: Partial<MeinuOptions>) {
		this.name = opts.name || 'Meinu';
		this.color = opts.color || '#007aff';
		this.owners = opts.owners || [];
		this.testing = opts.testing || false;
		opts.testing = this.testing;
		this.fullIntents = opts.fullIntents || false;
		opts.fullIntents = this.fullIntents;
		this.init(opts);
	}


	async registerCommands(): Promise<void> {
		for (const cmd of [ ...this.commands.values() ]) {
			await this.client.application.commands.create({
				name: cmd.name,
				description: cmd.description
			});
		}
	}

	private compareOption(local: ApplicationCommandOptionData, guild: ApplicationCommandOption[]): boolean {
		const keys = Object.keys(guild[0]);
		const matches = Object.fromEntries(Object.keys(local).map(k => [ k, false ]));
		for (const k of keys) {
			if (typeof local[k] !== 'undefined') {
				if (typeof guild.find(o => o[k] === local[k]) !== 'undefined') {
					matches[k] = true;
				}
			}
		}
		// console.log(matches);
		if (Object.values(matches).includes(false)) {
			return false;
		}
		return true;
	}

	private compareOptionGuild(guild: ApplicationCommandOption, local: ApplicationCommandOptionData[]): boolean {
		const matches = Object.fromEntries(Object.keys(guild).map(k => [ k, true ]));
		for (const k of Object.keys(guild)) {
			const find = local.find(o => typeof o[k] !== 'undefined' && o[k] === guild[k]);
			if (typeof find === 'undefined') {
				delete matches[k];
			}
		}
		console.log(matches);
		if (Object.values(matches).includes(false)) {
			return false;
		}
		return true;
	}

	async registerTestingCommands(): Promise<void> {
		console.log('hi');

		const guild = this.testingGuild;
		await guild.commands.fetch();
		if (guild.commands.cache.size > 0) {
			for (const cmd of [ ...guild.commands.cache.values() ]) {
				if (this.commands.has(cmd.name)) {
					const command = this.commands.get(cmd.name);
					if (typeof command.options !== 'undefined') {
						for (const option of command.options) {
							if (!this.compareOption(option, cmd.options)) {
								console.log(`Changes to ${cmd.name} locally`);
								await cmd.edit(command.commandInfo());
							}
						}
					}

					for (const option of cmd.options) {
						if (!this.compareOptionGuild(option, command.options)) {
							console.log(`Changes to ${cmd.name} on ${guild.name}`);
							await cmd.edit(command.commandInfo());
						}
					}
					// await cmd.edit(command.commandInfo());
				} else {
					await cmd.delete();
				}
			}
			console.log('found commands');
		}

		for (const cmd of [ ...this.commands.values() ].filter(c => c.type === 'CHAT_INPUT')) {
			if (typeof guild.commands.cache.find(c => c.name === cmd.name) === 'undefined') {
				await guild.commands.create({
					name: cmd.name,
					description: cmd.description,
					options: cmd.options,
					type: 'CHAT_INPUT'
				});
			}
		}

		for (const cmd of [ ...this.commands.values() ].filter(c => c.type === 'MESSAGE')) {
			if (typeof guild.commands.cache.find(c => c.name === cmd.name) === 'undefined') {
				await guild.commands.create({
					name: cmd.name,
					type: 'MESSAGE'
				});
			}
		}

		for (const cmd of [ ...this.commands.values() ].filter(c => c.type === 'USER')) {
			if (typeof guild.commands.cache.find(c => c.name === cmd.name) === 'undefined') {
				await guild.commands.create({
					name: cmd.name,
					type: 'USER'
				});
			}
		}

		console.log(this.commands);
	}

	async initCommands(cmds: Command[], registerDefaults = false): Promise<void> {
		if (registerDefaults) {
			for (const cmd of defaultCommands) {
				this.commands.set(cmd.name, cmd);
			}
		}

		if (typeof cmds !== 'undefined') {
			for (const cmd of cmds) {
				this.commands.set(cmd.name, cmd);
			}
		}
		if (this.testing) {
			console.time('register');
			await this.registerTestingCommands();
			return console.timeEnd('register');
		}
		return this.registerCommands();
	}

	async findCommand(cmd: string): Promise<Command> {
		if (this.commands.has(cmd)) {
			return this.commands.get(cmd);
		}
		throw 404;
	}

	async init(opts: Partial<MeinuOptions>): Promise<void> {
		config();

		if (opts.fullIntents) {
			this.client = new Client({ intents: Object.values(Intents.FLAGS) });
		} else {
			this.client = new Client({ intents: [ Intents.FLAGS.GUILDS ] });
		}


		this.client.on('ready', async () => {
			if (typeof opts.testing !== 'undefined' && opts.testing) {
				this.testing = opts.testing;
				this.testingGuild = this.client.guilds.cache.get(opts.testingGuild);
				await this.testingGuild.fetch();
			} else {
				this.testing = false;
			}
			await this.initCommands(opts.cmds, opts.registerDefaults);
			this.handler = new InteractionHandler(this);
			console.log(`Logged in as ${this.client.user.tag}!`);
		});

		if (typeof process.env.TOKEN === 'undefined' && typeof opts.token === 'undefined') {
			throw 'Token not defined.';
		}
		this.client.login(process.env.TOKEN ?? opts.token);
	}
}

export default Meinu;
export { Command, ScrollEmbed };
export * from 'discord.js';
