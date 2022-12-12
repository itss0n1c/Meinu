import { ButtonStyle, Command, create_scroll_embed } from '../../src/index.js';
export default new Command({
	name: 'scroll_embed',
	description: 'Scroll Embed'
}).addHandler('chatInput', async (bot, int) => {
	await int.deferReply();
	const data = [
		{
			title: 'Page 1',
			description: 'This is page 1',
			author: 'Author 1',
			date: new Date()
		},
		{
			title: 'Page 2',
			description: 'This is page 2',
			author: 'Author 2',
			date: new Date(2021, 1, 1)
		},
		{
			title: 'Page 3',
			description: 'This is page 3',
			author: 'Author 3',
			date: new Date(2021, 2, 1)
		},
		{
			title: 'Page 4',
			description: 'This is page 4',
			author: 'Author 4',
			date: new Date(2021, 3, 1)
		}
	];

	await create_scroll_embed({
		int,
		data,
		match: (val) => ({
			title: val.title,
			description: val.description,
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
