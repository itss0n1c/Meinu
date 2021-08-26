import { Client, Intents } from 'discord.js';
import { Command, Commands } from './Command';
import { config } from 'dotenv';
import { defaultCommands } from './cmds';
import { InteractionHandler } from './InteractionHandler';


export class Meinu {
	client: Client
	commands = new Commands()
	testing:boolean
	owners: string[]
	handler: InteractionHandler

	constructor(owners?: string[], cmds?: Command[]) {
		this.owners = owners || [];
		this.init(cmds);
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
		const guild = this.client.guilds.cache.get('744006904958812210');

		await guild.commands.fetch();
		if (guild.commands.cache.size > 0) {
			for await (const cmd of [ ...guild.commands.cache.values() ]) {
				if (this.commands.has(cmd.name)) {
					const command = this.commands.get(cmd.name);
					if (command.cmd_type === 'SLASH') {
						await cmd.edit({
							name: cmd.name,
							description: command.description,
							options: command.options,
							type: 'CHAT_INPUT'
						});
					}
				} else {
					await cmd.delete();
				}
			}
			console.log('found commands');
		}

		for await (const cmd of [ ...this.commands.values() ].filter(c => c.cmd_type === 'SLASH')) {
			if (typeof guild.commands.cache.find(c => c.name === cmd.name) === 'undefined') {
				await guild.commands.create({
					name: cmd.name,
					description: cmd.description,
					options: cmd.options,
					type: 'CHAT_INPUT'
				});
			}
		}

		for await (const cmd of [ ...this.commands.values() ].filter(c => c.cmd_type === 'CONTEXT')) {
			if (typeof guild.commands.cache.find(c => c.name === cmd.name) === 'undefined') {
				await guild.commands.create({
					name: cmd.name,
					type: 'MESSAGE'
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
			return this.registerTestingCommands();
		}
		return this.registerCommands();
	}

	async findCommand(cmd: string): Promise<Command> {
		if (this.commands.has(cmd)) {
			return this.commands.get(cmd);
		}
		throw 404;
	}

	async init(cmds?: Command[]): Promise<void> {
		config();
		this.testing = Boolean(process.env.TESTING);

		this.client = new Client({ intents: [ Intents.FLAGS.GUILDS ] });

		this.client.on('ready', async () => {
			await this.initCommands(cmds);
			this.handler = new InteractionHandler(this);
			console.log(`Logged in as ${this.client.user.tag}!`);
		});


		this.client.login(process.env.TOKEN);
	}
}
