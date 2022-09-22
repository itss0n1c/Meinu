import { Command, setLocales } from '../../src/index.js';

export default new Command({
	name: 'locale_test',
	description: setLocales({
		default: 'Locale test command.',
		ja: 'ロケールのテスト用コマンドです。'
	})
}).addHandler('chatInput', (bot, int) => int.reply('blah'));
