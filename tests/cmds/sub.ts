import { ActionRowBuilder, ApplicationCommandOptionType, ApplicationCommandType, ButtonBuilder, ButtonStyle, Command } from '../../src/index.js';

export default new Command({
	name: 'sub',
	description: 'sub command stuff',
	type: ApplicationCommandType.ChatInput
}).addSubCommands([
	new Command({
		name: 'foo',
		description: 'foo command stuff',
		options: [
			{
				name: 'bar',
				description: 'random shit',
				required: true,
				type: ApplicationCommandOptionType.String,
				autocomplete: true
			},
			{
				name: 'baz',
				description: 'random shit',
				required: true,
				type: ApplicationCommandOptionType.String,
				autocomplete: true
			}
		]
	})
		.addHandler('autocomplete', (bot, int) =>
			int.respond([
				{
					name: 'blah',
					value: 'blah'
				},
				{
					name: 'blah2',
					value: 'blah2'
				},
				{
					name: 'blah3',
					value: 'blah3'
				}
			])
		)
		.addHandler('chatInput', (bot, int) => int.reply(`${int.options.getString('bar')} ${int.options.getString('baz')}`)),
	new Command({
		name: 'bar',
		description: 'bar command stuff'
	})
		.addHandler('button', (bot, int) => int.reply(int.customId))
		.addHandler('chatInput', (bot, int) => {
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents([
				new ButtonBuilder().setLabel('blah').setCustomId('ah').setStyle(ButtonStyle.Primary)
			]);
			return int.reply({
				components: [ row ]
			});
		})
]);
