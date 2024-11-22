import {
	Client,
	type ClientOptions,
	Collection,
	type ColorResolvable,
	GatewayIntentBits,
	type Snowflake,
	Team,
	User,
	resolveColor,
} from 'discord.js';
import { type Command, InteractionHandler, _meinu_log } from './utils/index.js';
import chalk, { type ChalkInstance } from 'chalk';
import packageFile from '../package.json';
import { register_cmds } from './utils/register.js';

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
	meinu_version = packageFile.version;

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

	findCommand(cmd_name: string): Command<this> | null {
		const cmd = this.commands.get(cmd_name);
		if (!cmd) {
			return null;
		}
		return cmd;
	}

	async init(_token?: string): Promise<this> {
		_meinu_log({ title: 'init' }, `Initializing ${this.bot_chalk(this.name)}`);
		if (typeof Bun.env.TOKEN === 'undefined' && typeof _token === 'undefined') {
			throw new Error('Token is not defined');
		}
		await super.login(_token ?? Bun.env.TOKEN);

		if (!this.user) {
			throw new Error('Client user is not defined');
		}

		await register_cmds(this);

		this.handler = new InteractionHandler(this);
		_meinu_log({ title: 'init' }, `Logged in as ${this.bot_chalk(this.user.tag)}!`);
		return this;
	}
}

export * from 'discord.js';
export * from './cmds/index.js';
export * from './utils/index.js';
export { Meinu };
