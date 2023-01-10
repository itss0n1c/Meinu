import { Meinu } from '../src/index.js';
import cmds from './cmds/index.js';

class TestBot extends Meinu {
	static async create(): Promise<TestBot> {
		const bot = new TestBot({
			owners: [ '211160171945263105' ]
		}).register_commands(cmds);
		await bot.init();
		return bot;
	}
}

await TestBot.create();
