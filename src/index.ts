import { Client, ColorResolvable, Guild, Intents } from 'discord.js';
import { Command, Commands } from './Command';
import ScrollEmbed from './ScrollEmbed';
import { config } from 'dotenv';
import { defaultCommands } from './cmds';
import { InteractionHandler } from './InteractionHandler';

export interface MeinuOptionsBasics {
	color?: ColorResolvable
	name?: string
	owners: string[]
	cmds?: Command[]
}

export interface MeinuOptionsPublic extends MeinuOptionsBasics {
	testing?: false
}

export interface MeinuOptionsTesting extends MeinuOptionsBasics {
	testing?: true
	testingGuild: string
}

export type MeinuOptions = MeinuOptionsTesting | MeinuOptionsPublic;

class Meinu {
	name: string
	color: ColorResolvable
	client: Client
	commands = new Commands()
	testing:boolean
	owners: string[]
	handler: InteractionHandler
	testingGuild: Guild

	constructor(opts: MeinuOptions) {
		this.name = opts.name || 'Meinu';
		this.color = opts.color || '#007aff';
		this.owners = opts.owners || [];
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

	async registerTestingCommands(): Promise<void> {
		console.log('hi');

		const guild = this.testingGuild;


		if (guild.commands.cache.size > 0) {
			for (const cmd of [ ...guild.commands.cache.values() ]) {
				if (this.commands.has(cmd.name)) {
					const command = this.commands.get(cmd.name);
					await cmd.edit(command.commandInfo());
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

	async initCommands(cmds: Command[]): Promise<void> {
		for (const cmd of defaultCommands) {
			this.commands.set(cmd.name, cmd);
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

	async init(opts: MeinuOptions): Promise<void> {
		config();

		this.client = new Client({ intents: [ Intents.FLAGS.GUILDS ] });

		this.client.on('ready', async () => {
			if (typeof opts.testing !== 'undefined' && opts.testing) {
				this.testing = opts.testing;
				this.testingGuild = this.client.guilds.cache.get(opts.testingGuild);
				await this.testingGuild.fetch();
			} else {
				this.testing = false;
			}
			await this.initCommands(opts.cmds);
			this.handler = new InteractionHandler(this);
			console.log(`Logged in as ${this.client.user.tag}!`);
		});


		this.client.login(process.env.TOKEN);
	}
}

export default Meinu;
export { Command, ScrollEmbed };
export * from 'discord.js';
