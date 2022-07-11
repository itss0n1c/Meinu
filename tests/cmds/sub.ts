import { Command } from '../../src';

export default new Command({
	name: 'sub',
	description: 'sub command stuff',
	type: 'CHAT_INPUT'
}).addSubCommands([
	new Command({
		name: 'foo',
		description: 'foo lol'
	}).run(() => 'foo'),
	new Command({
		name: 'bar',
		description: 'bar lol'
	}).run(() => 'bar')
]);
