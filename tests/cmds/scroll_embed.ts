import { StringLike } from 'bun';
import {
	ActionRowBuilder,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonStyle,
	Command,
	EmbedBuilder,
	create_scroll_embed,
} from '../../lib/index.js';

export default new Command({
	name: 'scroll_embed',
	description: 'Scroll Embed',
}).addHandler('chatInput', async (bot, int) => {
	await int.reply('loading...');

	const make_data = (index: number) => ({
		title: `Page ${index + 1}`,
		description: 'This is page {page}',
		author: `Author ${index + 1}`,
		// random date using math random
		date: new Date(2021, Math.floor(Math.random() * 12), Math.floor(Math.random() * 31)),
	});

	// const gen_data = () => Array.from({ length: 10 }, (_, i) => make_data(i));
	const gen_data = async (): Promise<Array<Record<string, any>>> => {
		throw new Error('No data found.');
	};

	await create_scroll_embed({
		int,
		data: gen_data,
		show_page_count: true,
		fail_msg: {
			content: 'No data found. Please try again later.',
		},
		match: async (val, index) => {
			const res = await fetch('https://thispersondoesnotexist.com/').then((r) => r.arrayBuffer());
			const img = new AttachmentBuilder(Buffer.from(res), {
				name: 'thispersondoesnotexist.jpg',
			});
			return {
				content: [
					`This is page ${index + 1}`,
					`Author: ${val.author}`,
					`Date: ${val.date.toDateString()}`,
				].join('\n'),
				files: [img],
				components: [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder().setCustomId('random').setLabel('Random').setStyle(ButtonStyle.Secondary),
					),
				],
			};
		},
	});
});
