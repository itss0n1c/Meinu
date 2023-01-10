import { Command } from '../../src';

export default new Command({
	name: 'nsfw',
	description: 'NSFW command',
	nsfw: true
}).addHandler('chatInput', (bot, int) => int.reply('NSFW command'));
