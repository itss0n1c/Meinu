import { Command } from '../utils/index.js';

export default new Command({
	name: 'help',
	description: 'show the help info'
}).addHandler('chatInput', (bot, int) => int.reply('WIP'));
