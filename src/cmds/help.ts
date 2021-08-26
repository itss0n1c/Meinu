import { Command } from '../Command';

const help = new Command({
	name: 'help',
	description: 'show the help info'
});

help.run(() => 'WIP');

export default help;
