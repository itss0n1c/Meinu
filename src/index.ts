import { ApplicationCommandOption, ApplicationCommandOptionData, Client, ColorResolvable, Guild, Intents } from 'discord.js';
import { config } from 'dotenv';
import { Command, Commands } from './Command';
import { InteractionHandler } from './InteractionHandler';

export interface MeinuOptionsBasics {
	color: ColorResolvable;
	name: string;
	owners: string[];
	cmds: Command[];
	fullIntents: boolean;
	token: string;
}

export interface MeinuOptionsPublic extends MeinuOptionsBasics {
	testing: false;
}

export interface MeinuOptionsTesting extends MeinuOptionsBasics {
	testing: true;
	testingGuild: string;
}

export type MeinuOptions = MeinuOptionsPublic | MeinuOptionsTesting;

class Meinu {
	name: string;
	color: ColorResolvable;
	client: Client;
	commands = new Commands();
	testing: boolean;
	testingGuild: string;
	owners: string[];
	handler: InteractionHandler;
	fullIntents: boolean;

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
		if (guild.length === 0) {
			return true;
		}
		const keys = Object.keys(guild[0]);
		const matches = Object.fromEntries(Object.keys(local).map((k) => [ k, false ]));
		for (const k of keys) {
			if (typeof local[k] !== 'undefined') {
				if (typeof guild.find((o) => o[k] === local[k]) !== 'undefined') {
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
		const matches = Object.fromEntries(Object.keys(guild).map((k) => [ k, true ]));
		for (const k of Object.keys(guild)) {
			const find = local.find((o) => typeof o[k] !== 'undefined' && o[k] === guild[k]);
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

	private async registerTestingCommandForGuild(guild: Guild): Promise<void> {
		await guild.commands.fetch();
		console.log(guild.name);
		if (guild.commands.cache.size > 0) {
			await Promise.all(
				guild.commands.cache.map(async (cmd) => {
					console.log(cmd.name);
					if (this.commands.has(cmd.name)) {
						const command = this.commands.get(cmd.name);
						if (typeof command.options !== 'undefined') {
							if (command.options.some((o) => this.compareOption(o, cmd.options ?? []))) {
								console.log(`Changes to ${cmd.name} locally`);
								await cmd.edit({
									name: command.name,
									description: command.description,
									type: command.type as any,
									options: command.options
								});
							}
						}

						for (const option of cmd.options) {
							if (!this.compareOptionGuild(option, command.options)) {
								console.log(`Changes to ${cmd.name} on ${guild.name}`);
								await cmd.edit({
									name: command.name,
									description: command.description,
									type: command.type as any,
									options: command.options
								});
							}
						}
						// await cmd.edit(command.commandInfo());
					} else {
						console.log(`deleting ${cmd.name} on ${guild.name}`);
						await cmd.delete();
					}
				})
			);

			console.log('found commands');
		}
		await Promise.all(
			this.commands
				.filter((c) => c.type === 'CHAT_INPUT')
				.filter((c) => !guild.commands.cache.some((cmd) => c.name === cmd.name))
				.map((c) =>
					guild.commands.create({
						name: c.name,
						description: c.description,
						options: c.options,
						type: 'CHAT_INPUT'
					})
				)
		);

		await Promise.all(
			this.commands
				.filter((c) => c.type === 'MESSAGE')
				.filter((c) => !guild.commands.cache.some((cmd) => c.name === cmd.name))
				.map((c) =>
					guild.commands.create({
						name: c.name,
						type: 'MESSAGE'
					})
				)
		);

		await Promise.all(
			this.commands
				.filter((c) => c.type === 'USER')
				.filter((c) => !guild.commands.cache.some((cmd) => c.name === cmd.name))
				.map((c) =>
					guild.commands.create({
						name: c.name,
						type: 'USER'
					})
				)
		);
	}

	async registerTestingCommands(): Promise<void> {
		console.log('hi');
		if (!this.testingGuild) {
			const settledGuilds = await Promise.allSettled(this.client.guilds.cache.map((g) => g.fetch()));
			const guilds = settledGuilds.filter((s) => s.status === 'fulfilled').map((s) => s.status === 'fulfilled' && s.value);
			console.log(
				'Guilds',
				guilds.flatMap((g) => g.name)
			);

			await Promise.all(guilds.map((g) => this.registerTestingCommandForGuild(g)));
		} else {
			await this.registerTestingCommandForGuild(await this.client.guilds.cache.get(this.testingGuild).fetch());
		}

		console.log(this.commands);
	}

	private async initCommands(cmds: Command[]): Promise<void> {
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

	private async init(opts: Partial<MeinuOptions>): Promise<void> {
		config();

		if (opts.fullIntents) {
			this.client = new Client({ intents: Object.values(Intents.FLAGS) });
		} else {
			this.client = new Client({ intents: [ Intents.FLAGS.GUILDS ] });
		}

		this.client.on('ready', async () => {
			this.testing = opts.testing ?? false;
			this.testingGuild = opts.testing ? opts.testingGuild : null;
			await this.initCommands(opts.cmds);
			this.handler = new InteractionHandler(this);
			console.log(`Logged in as ${this.client.user.tag}!`);
		});

		if (typeof process.env.TOKEN === 'undefined' && typeof opts.token === 'undefined') {
			throw 'Token not defined.';
		}
		this.client.login(process.env.TOKEN ?? opts.token);
	}
}

export * from 'discord.js';
export * from './cmds';
export { Meinu, Command };
