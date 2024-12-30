import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	type AutocompleteInteraction,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	Command,
	type Meinu,
	type RepliableInteraction,
} from '../../lib/index.js';
import type { CommandInfo } from '../../lib/utils/Command.js';

const handle_autocomplete = (bot: Meinu, int: AutocompleteInteraction) =>
	int.respond([
		{
			name: 'bar',
			value: 'bar',
		},
		{
			name: 'bar2',
			value: 'bar2',
		},
		{
			name: 'bar3',
			value: 'bar3',
		},
	]);

const handle_button = (bot: Meinu, int: ButtonInteraction) => int.reply(int.customId);

const handle_chat = (bot: Meinu, int: RepliableInteraction) => {
	const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
		new ButtonBuilder().setLabel('blah').setCustomId('ah').setStyle(ButtonStyle.Primary),
	]);
	return int.reply({
		components: [row],
	});
};

const command_info: CommandInfo = {
	name: 'foo',
	description: 'bar command stuff',
	options: [
		{
			name: 'foo',
			description: 'random shit',
			required: true,
			type: ApplicationCommandOptionType.String,
			autocomplete: true,
		},
	],
};

export default new Command({
	name: 'sub',
	description: 'sub command stuff',
	type: ApplicationCommandType.ChatInput,
})
	.addSubCommandGroup({
		name: 'group1',
		description: 'a group',
		commands: [
			new Command(command_info)
				.addHandler('autocomplete', handle_autocomplete)
				.addHandler('button', handle_button)
				.addHandler('chatInput', handle_chat),
		],
	})
	.addSubCommandGroup({
		name: 'group2',
		description: 'a group',
		commands: [
			new Command(command_info)
				.addHandler('autocomplete', handle_autocomplete)
				.addHandler('button', handle_button)
				.addHandler('chatInput', handle_chat),
		],
	})
	.addSubCommands([
		new Command(command_info)
			.addHandler('autocomplete', handle_autocomplete)
			.addHandler('button', handle_button)
			.addHandler('chatInput', handle_chat),
	]);
