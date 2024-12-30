import {
	type APIApplicationCommand as APIApplicationCommandOrig,
	type ApplicationCommand,
	type Collection,
	type Command,
	type Guild,
	type Meinu,
	_meinu_log,
} from '../index.js';
import type { CommandInfoExport } from './Command.js';

async function _register_global_command<Inst extends Meinu>(bot: Inst, cmds: Collection<string, Command<Inst>>) {
	if (!bot.application) return;
	return bot.rest.put(`/applications/${bot.application.id}/commands`, {
		body: cmds.map((c) => c.commandInfo()),
	});
}

async function _update_global_command<Inst extends Meinu>(bot: Inst, current: ApplicationCommand, cmd: Command<Inst>) {
	if (!bot.application) return;
	return bot.rest.patch(`/applications/${bot.application.id}/commands/${current.id}`, {
		body: cmd.commandInfo(),
	});
}

function similar_cmd(cmd: ApplicationCommand, local_cmd: CommandInfoExport) {
	const orig = cmd.equals(local_cmd);
	const compareArrs = <T>(a: T[], b: T[]) => a.length === b.length && a.every((v) => b.includes(v));
	const integration_types = cmd.integrationTypes ?? [];
	const contexts = cmd.contexts ?? [];

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
		if (!find) {
			await _meinu_log(
				{ cb: _register_global_command(bot, cmds), title: 'cmd_create' },
				`Registering global command ${bot.bot_chalk(cmd.name.default)}`,
			);
		} else {
			const should_update = !similar_cmd(find, local_cmd);
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

	await _meinu_log({ title: 'cmd_info' }, `Checking guild commands for guild ${bot.bot_chalk(guild.name)}`);

	for (const cmd of cmds_manager.cache.values()) {
		const local_cmd = cmds.get(cmd.name);
		if (local_cmd) continue;
		await _meinu_log(
			{ cb: cmd.delete(), title: 'cmd_delete' },
			`Removing guild command ${bot.bot_chalk(cmd.name)} for ${bot.bot_chalk(guild.name)}`,
		);
	}

	const adding: Array<Command<Inst>> = [];
	const updating: Array<[Command<Inst>, ApplicationCommand]> = [];

	for (const cmd of cmds.values()) {
		const local_cmd = cmd.commandInfo();
		const find = cmds_manager.cache.find((c) => c.name === cmd.name.default);
		if (!find) adding.push(cmd);
		else {
			const should_update = !find.equals(local_cmd);
			if (should_update) updating.push([cmd, find]);
		}
	}

	if (adding.length) {
		await _meinu_log(
			{
				title: 'cmd_info',
			},
			`Adding ${bot.bot_chalk(adding.length)} guild commands for guild ${bot.bot_chalk(guild.name)}`,
		);

		for await (const cmd of adding) {
			await _meinu_log(
				{ cb: cmds_manager.create(cmd.commandInfo()), title: 'cmd_create' },
				`Registering guild command ${bot.bot_chalk(cmd.name.default)} for ${bot.bot_chalk(guild.name)}`,
			);
		}
	}

	if (updating.length) {
		await _meinu_log(
			{
				title: 'cmd_info',
			},
			`Updating ${bot.bot_chalk(updating.length)} guild commands for guild ${bot.bot_chalk(guild.name)}`,
		);

		for await (const [cmd, find] of updating) {
			const local_cmd = cmd.commandInfo();
			await _meinu_log(
				{ cb: find.edit(local_cmd), title: 'cmd_update' },
				`Updating guild command ${bot.bot_chalk(cmd.name.default)} for ${bot.bot_chalk(guild.name)}`,
			);
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
