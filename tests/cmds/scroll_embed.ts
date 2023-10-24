import { AttachmentBuilder, Command, DataResolver, create_scroll_embed } from '../../src/index.js';

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
		match: async (val, index) => {
			const res = await DataResolver.resolveFile('https://thispersondoesnotexist.com/');
			const img = new AttachmentBuilder(res.data, {
				name: 'thispersondoesnotexist.jpg'
			});
			return {
				embed: {
					title: val.title,
					description: val.description.replace('{page}', `${index + 1}`),
					author: {
						name: val.author
					},
					image: {
						url: `attachment://${img.name}`
					},
					timestamp: val.date.toJSON()
				},
				files: [ img ]
			};
		}
	});
});
