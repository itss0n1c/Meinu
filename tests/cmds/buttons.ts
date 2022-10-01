import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Command } from '../../src/index.js';

export default new Command({
	name: 'buttons',
	description: 'Test buttons'
}).addSubCommands([
	new Command({
		name: 'button1',
		description: 'Test button 1'
	})
		.addHandler('button', (bot, int) => int.reply(int.customId))
		.addHandler('chatInput', (bot, int) =>
			int.reply({
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder().setLabel('Test').setCustomId('button1').setStyle(ButtonStyle.Primary)
					)
				],
				ephemeral: true
			})
		),
	new Command({
		name: 'button2',
		description: 'Test button 2'
	})
		.addHandler('button', (bot, int) => int.reply(int.customId))
		.addHandler('chatInput', (bot, int) =>
			int.reply({
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder().setLabel('Test').setCustomId('button2').setStyle(ButtonStyle.Primary)
					)
				]
			})
		)
]);
