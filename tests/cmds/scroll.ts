import { ScrollEmbed, MessageEmbed } from '../../src';

interface RandomData {
	name: string
}

const scroll = new ScrollEmbed<RandomData>({
	name: 'scroll',
	description: 'testing scroll',
	options: [
		{
			name: 'ah',
			description: 'gg',
			type: 'STRING',
			required: true
		}
	],
	genData: () => [ { name: 'blah' }, { name: 'ah' } ],
	genEmbed: async (bot, list, page) => {
		console.log(list, page);
		const data = list[page - 1];
		const embed = new MessageEmbed()
			.setDescription(data.name);
		return embed;
	}
});


export default scroll;
