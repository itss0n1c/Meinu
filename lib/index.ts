import {
	ApplicationCommandManager,
	Client,
	ClientOptions,
	Collection,
	ColorResolvable,
	GatewayIntentBits,
	Guild,
	GuildApplicationCommandManager,
	Snowflake,
	Team,
	User,
	resolveColor,
} from 'discord.js';
import { config } from 'dotenv';
import { Command, InteractionHandler, _meinu_log } from './utils/index.js';
import chalk, { ChalkInstance } from 'chalk';

export interface MeinuOptions {
	name: string;
	color: ColorResolvable;
	clientOptions?: ClientOptions;
}

class Meinu extends Client {
	name: string;
	color: ColorResolvable;
	handler: InteractionHandler | undefined;
	commands: Collection<string, Command<this>>;

	constructor(opts: MeinuOptions) {
		if (opts.clientOptions) {
			super(opts.clientOptions);
		} else {
			super({
				intents: [GatewayIntentBits.Guilds],
			});
		}
		this.name = opts.name;
		this.color = opts.color;
		this.commands = new Collection<string, Command<this>>();
	}

	register_commands(cmds: Command<this>[]): this {
		for (const cmd of cmds) {
			this.commands.set(cmd.name.default, cmd);
		}
		return this;
	}

	get bot_chalk(): ChalkInstance {
		return chalk.hex(resolveColor(this.color).toString(16));
	}

	async owners(): Promise<Collection<Snowflake, User>> {
		if (!this.application) throw new Error('Application is not defined');
		const app = await this.application.fetch();
		const { owner } = app;
		if (owner instanceof User) return new Collection([[owner.id, owner]]);
		if (owner instanceof Team) return owner.members.mapValues((m) => m.user);
		throw new Error('Unknown owner type');
	}

	private async init_commands(): Promise<void> {
		if (!this.application) {
			throw new Error('Application is not defined');
		}
		const local_global_commands = this.commands.filter((c) => c.global);
		const local_guild_commands = this.commands.filter((c) => !c.global);

		const register_commands = async ({
			manager,
			guild,
		}: { manager: ApplicationCommandManager | GuildApplicationCommandManager; guild?: Guild }) => {
			await manager.fetch({
				withLocalizations: true,
			});
			const type = guild ? 'guild' : 'global';
			const all_cmds = {
				global: local_global_commands,
				guild: local_guild_commands,
			};
			// eslint-disable-next-line no-unused-vars
			for (const cmd of manager.cache.values()) {
				const local_cmd = all_cmds[type].get(cmd.name);
				if (local_cmd) {
					continue;
				}
				await _meinu_log(
					{
						cb: cmd.delete(),
						title: 'cmd_delete',
					},
					`Removing ${type} command ${this.bot_chalk(cmd.name)} ${guild ? `for guild ${guild.name}` : ''}`,
				);
			}

			await _meinu_log(
				{ title: 'cmd_info' },
				`Checking ${type} commands ${guild ? `for guild ${guild.name}` : ''}`,
			);

			await _meinu_log(
				{
					cb: Promise.all(
						all_cmds[type].map(async (local_cmd) => {
							const local_cmd_info = local_cmd.commandInfo();
							const find = manager.cache.find((cmd) => cmd.name === local_cmd.name.default);
							if (!find) {
								await _meinu_log(
									{ cb: manager.create(local_cmd_info), title: 'cmd_create' },
									`Registering ${type} command ${this.bot_chalk(local_cmd.name.default)} ${
										guild ? `for guild ${guild.name}` : ''
									}`,
								);
							} else {
								const should_update = !find.equals(local_cmd_info);
								await _meinu_log(
									{ cb: void 0, title: 'cmd_status' },
									`${this.bot_chalk(local_cmd.name.default)} needs update →`,
									should_update,
								);
								if (should_update) {
									await manager.edit(find.id, local_cmd_info);
								}
							}
						}),
					),
					title: 'Commands',
				},
				`Registered ${this.bot_chalk(local_guild_commands.size.toLocaleString())} guild commands ${
					guild ? `for guild ${guild.name}` : ''
				}`,
			);
		};

		if (local_guild_commands.size > 0) {
			await Promise.all(
				this.guilds.cache.map(async (guild) => {
					await register_commands({
						manager: guild.commands,
						guild,
					});
				}),
			);
		}

		await register_commands({
			manager: this.application.commands,
		});
	}

	findCommand(cmd_name: string): Command<this> | null {
		const cmd = this.commands.get(cmd_name);
		if (!cmd) {
			return null;
		}
		return cmd;
	}

	async init(_token?: string): Promise<this> {
		_meinu_log({ title: 'init' }, `Initializing ${this.bot_chalk(this.name)}`);
		config();
		if (typeof process.env.TOKEN === 'undefined' && typeof _token === 'undefined') {
			throw new Error('Token is not defined');
		}
		await super.login(_token ?? process.env.TOKEN);

		if (!this.user) {
			throw new Error('Client user is not defined');
		}

		await this.init_commands();

		this.handler = new InteractionHandler(this);
		_meinu_log({ title: 'init' }, `Logged in as ${this.bot_chalk(this.user.tag)}!`);
		return this;
	}
}

export * from 'discord.js';
export * from './cmds/index.js';
export * from './utils/index.js';
export { Meinu };
