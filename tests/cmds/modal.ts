import { inspect } from 'node:util';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Command,
	EmbedBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from '../../lib/index.js';
export default new Command({
	name: 'modal',
	description: 'Modal command',
}).addSubCommandGroup({
	name: 'group',
	description: 'group',
	commands: [
		new Command({
			name: 'one',
			description: 'Modal command',
		})
			.addHandler('button', async (bot, int) => {
				const modal = new ModalBuilder().setCustomId('modal-group-one-modal').setTitle('Modal');

				const textInput = new TextInputBuilder()
					.setCustomId('text')
					.setLabel('Text input')
					.setStyle(TextInputStyle.Paragraph);
				const row = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
				modal.addComponents(row);

				return int.showModal(modal);
			})
			.addHandler('modalSubmit', (bot, int) => {
				const embed = new EmbedBuilder()
					.setTitle('Modal submitted')
					.setDescription(`\`\`\`js\n${inspect(int.fields.fields, false, 5)}\`\`\``);
				return int.reply({
					embeds: [embed],
				});
			})
			.addHandler('chatInput', async (bot, int) => {
				await int.deferReply();

				await int.channel?.send({
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder()
								.setCustomId('modal-group-one-modal')
								.setLabel('Open modal')
								.setStyle(ButtonStyle.Primary),
						),
					],
				});

				return int.deleteReply();
			}),
	],
});
