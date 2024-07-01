import {
	type APIApplicationCommand as APIApplicationCommandOrig,
	type ApplicationCommand,
	type Collection,
	type Command,
	type Guild,
	type Meinu,
	_meinu_log,
} from '../index.js';
import type { CommandContext, CommandInfoExport, CommandIntegrationType } from './Command.js';

async function _register_global_command<Inst extends Meinu>(bot: Inst, cmds: Collection<string, Command<Inst>>) {
	if (!bot.application) return;
	return bot.rest.put(`/applications/${bot.application.id}/commands`, {
		body: cmds.map((c) => c.commandInfo()),
	});
}

async function _update_global_command<Inst extends Meinu>(bot: Inst, current: ApplicationCommand, cmds: Command<Inst>) {
	if (!bot.application) return;
	return bot.rest.patch(`/applications/${bot.application.id}/commands/${current.id}`, {
		body: cmds.commandInfo(),
	});
}

interface APIApplicationCommand extends APIApplicationCommandOrig {
	integration_types?: CommandIntegrationType[];
	contexts?: CommandContext[];
}

async function retrieve_global_cmds<Inst extends Meinu>(bot: Inst): Promise<APIApplicationCommand[]> {
	if (!bot.application) throw new Error('Application is not defined');
	return bot.rest.get(`/applications/${bot.application.id}/commands`) as Promise<APIApplicationCommand[]>;
}

function similar_cmd(cmd: ApplicationCommand, raw_cmd: APIApplicationCommand, local_cmd: CommandInfoExport) {
	const orig = cmd.equals(local_cmd);
	const compareArrs = <T>(a: T[], b: T[]) => a.length === b.length && a.every((v, i) => v === b[i]);
	const integration_types = raw_cmd.integration_types ?? [];
	const contexts = raw_cmd.contexts ?? [];

	const local_integration_types = local_cmd.integration_types ?? [];
	const local_contexts = local_cmd.contexts ?? [];

	return orig && compareArrs(integration_types, local_integration_types) && compareArrs(contexts, local_contexts);
}

async function register_global<Inst extends Meinu>(bot: Inst, cmds: Collection<string, Command<Inst>>) {
	if (!bot.application) return;
	const cmds_manager = bot.application.commands;
	await cmds_manager.fetch({
		withLocalizations: true,
	});
	const global_cmds = await retrieve_global_cmds(bot);

	await _meinu_log({ title: 'cmd_info' }, 'Checking global commands');

	for (const cmd of cmds_manager.cache.values()) {
		const local_cmd = cmds.get(cmd.name);
		if (local_cmd) continue;
		await _meinu_log(
			{ cb: cmd.delete(), title: 'cmd_delete' },
			`Removing global command ${bot.bot_chalk(cmd.name)}`,
		);
	}

	for (const cmd of cmds.values()) {
		const local_cmd = cmd.commandInfo();
		const find = cmds_manager.cache.find((c) => c.name === cmd.name.default);
		const findRaw = global_cmds.find((c) => c.name === cmd.name.default);
		if (!find || !findRaw) {
			await _meinu_log(
				{ cb: _register_global_command(bot, cmds), title: 'cmd_create' },
				`Registering global command ${bot.bot_chalk(cmd.name.default)}`,
			);
		} else {
			const should_update = !similar_cmd(find, findRaw, local_cmd);
			await _meinu_log(
				{ cb: void 0, title: 'cmd_status' },
				`${bot.bot_chalk(cmd.name.default)} needs update →`,
				should_update,
			);
			if (should_update) await _update_global_command(bot, find, cmd);
		}
	}

	await _meinu_log({ title: 'Commands' }, `Registered ${bot.bot_chalk(cmds.size.toLocaleString())} global commands`);
}

async function register_guild<Inst extends Meinu>(bot: Inst, guild: Guild, cmds: Collection<string, Command<Inst>>) {
	const cmds_manager = guild.commands;
	await cmds_manager.fetch({
		withLocalizations: true,
	});

	await _meinu_log({ title: 'cmd_info' }, `Checking guild commands for guild ${guild.name} [WIP]`);

	for (const cmd of cmds_manager.cache.values()) {
		const local_cmd = cmds.get(cmd.name);
		if (local_cmd) continue;
		await _meinu_log(
			{ cb: cmd.delete(), title: 'cmd_delete' },
			`Removing global command ${bot.bot_chalk(cmd.name)} for guild ${guild.name}`,
		);
	}

	for (const cmd of cmds.values()) {
		const local_cmd = cmd.commandInfo();
		const find = cmds_manager.cache.find((c) => c.name === cmd.name.default);
		if (!find) {
			await _meinu_log(
				{ cb: cmds_manager.create(cmd.commandInfo()), title: 'cmd_create' },
				`Registering global command ${bot.bot_chalk(cmd.name.default)} for guild ${guild.name}`,
			);
		} else {
			const should_update = !find.equals(local_cmd);
			await _meinu_log(
				{ cb: void 0, title: 'cmd_status' },
				`${bot.bot_chalk(cmd.name.default)} needs update →`,
				should_update,
			);
			if (should_update) await _update_global_command(bot, find, cmd);
		}
	}
}

export async function register_cmds<Inst extends Meinu>(bot: Inst) {
	if (!bot.application) throw new Error('Application is not defined');

	const local_global_commands = bot.commands.filter((c) => c.global);
	const local_guild_commands = bot.commands.filter((c) => !c.global);

	if (local_guild_commands.size > 0) {
		await Promise.all(
			bot.guilds.cache.map(async (guild) => {
				await register_guild(bot, guild, local_guild_commands);
			}),
		);
	}

	await register_global(bot, local_global_commands);
}
