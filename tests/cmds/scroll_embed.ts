import { ButtonStyle, Command, create_scroll_embed } from '../../src/index.js';
export default new Command({
	name: 'scroll_embed',
	description: 'Scroll Embed'
}).addHandler('chatInput', async (bot, int) => {
	await int.deferReply();

	const make_data = (index: number) => ({
		title: `Page ${index + 1}`,
		description: 'This is page {page}',
		author: `Author ${index + 1}`,
		// random date using math random
		date: new Date(2021, Math.floor(Math.random() * 12), Math.floor(Math.random() * 31))
	});

	const gen_data = () => Array.from({ length: 10 }, (_, i) => make_data(i));

	await create_scroll_embed({
		int,
		data: gen_data,
		match: (val, index) => ({
			title: val.title,
			description: val.description.replace('{page}', `${index + 1}`),
			author: {
				name: val.author
			},
			timestamp: val.date.toJSON()
		}),
		buttons: [
			{
				id: 'extra',
				label: 'Extra',
				style: ButtonStyle.Primary,
				action: (int) =>
					int.reply({
						content: 'wow, you clicked the extra button!',
						ephemeral: true
					})
			}
		]
	});
});
