import {
	ApplicationCommandManager,
	Client,
	ClientOptions,
	Collection,
	ColorResolvable,
	GatewayIntentBits,
	Guild,
	GuildApplicationCommandManager
} from 'discord.js';
import { config } from 'dotenv';
import { Command, InteractionHandler } from './utils/index.js';

export interface MeinuOptions {
	name: string;
	owners: string[];
	color: ColorResolvable;
	clientOptions?: ClientOptions;
}

class Meinu extends Client {
	name: string;
	color: ColorResolvable;
	owners: string[];
	handler: InteractionHandler | undefined;
	commands: Collection<string, Command<this>>;

	constructor(opts: MeinuOptions) {
		if (opts.clientOptions) {
			super(opts.clientOptions);
		} else {
			super({
				intents: [ GatewayIntentBits.Guilds ]
			});
		}
		this.name = opts.name;
		this.color = opts.color;
		this.owners = opts.owners;
		this.commands = new Collection<string, Command<this>>();
		this.handler = undefined;
	}

	register_commands(cmds: Command<this>[]): this {
		for (const cmd of cmds) {
			this.commands.set(cmd.name.default, cmd);
		}
		return this;
	}

	private async init_commands(): Promise<void> {
		if (!this.application) {
			throw new Error('Application is not defined');
		}
		const local_global_commands = this.commands.filter((c) => c.global);
		const local_guild_commands = this.commands.filter((c) => !c.global);

		const register_commands = async ({ manager, guild }: { manager: ApplicationCommandManager | GuildApplicationCommandManager; guild?: Guild }) => {
			await manager.fetch({
				withLocalizations: true
			});
			const type = guild ? 'guild' : 'global';
			const all_cmds = {
				global: local_global_commands,
				guild: local_guild_commands
			};
			// eslint-disable-next-line no-unused-vars
			for (const cmd of manager.cache.values()) {
				const local_cmd = all_cmds[type].get(cmd.name);
				if (local_cmd) {
					continue;
				}
				console.log(`Removing ${type} command ${cmd.name} ${guild ? `for guild ${guild.name}` : ''}`);
				await cmd.delete();
			}
			console.time(`Registering ${type} commands ${guild ? `for guild ${guild.name}` : ''}`);
			await Promise.all(
				all_cmds[type].map(async (local_cmd) => {
					const local_cmd_info = local_cmd.commandInfo();
					const find = manager.cache.find((cmd) => cmd.name === local_cmd.name.default);
					if (!find) {
						console.log(`Registering ${type} command ${local_cmd.name.default} ${guild ? `for guild ${guild.name}` : ''}`);
						await manager.create(local_cmd_info);
					} else {
						const should_update = !find.equals(local_cmd_info);
						console.log(local_cmd.name.default, should_update);
						if (should_update) {
							await manager.edit(find.id, local_cmd_info);
						}
					}
				})
			);
			console.timeEnd(`Registering ${type} commands ${guild ? `for guild ${guild.name}` : ''}`);
		};

		if (local_guild_commands.size > 0) {
			await Promise.all(
				this.guilds.cache.map(async (guild) => {
					await register_commands({
						manager: guild.commands,
						guild
					});
				})
			);
		}

		await register_commands({
			manager: this.application.commands
		});
	}

	findCommand(cmd_name: string): Command<this> {
		const cmd = this.commands.get(cmd_name);
		if (!cmd) {
			throw new Error(`Command ${cmd_name} not found`);
		}
		return cmd;
	}

	async init(_token?: string): Promise<this> {
		config();
		if (typeof process.env.TOKEN === 'undefined' && typeof _token === 'undefined') {
			throw 'Token not defined.';
		}
		await super.login(_token ?? process.env.TOKEN);

		if (!this.user) {
			throw new Error('Client user is not defined');
		}

		await this.init_commands();

		this.handler = new InteractionHandler(this);
		console.log(`Logged in as ${this.user.tag}!`);
		return this;
	}
}

export * from 'discord.js';
export * from './cmds/index.js';
export * from './utils/index.js';
export { Meinu };
