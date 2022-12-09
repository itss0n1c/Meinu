import { Command, setLocales } from '../../src/index.js';

export default new Command({
	name: setLocales({
		default: 'locale_test',
		ja: 'ロケールテスト'
	}),
	description: setLocales({
		default: 'Locale test command.',
		ja: 'ロケールのテスト用コマンドです。'
	})
}).addHandler('chatInput', (bot, int) => int.reply('blah'));
