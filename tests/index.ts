import { echo, evalc, help } from '../src/index.js';

import { Meinu } from '../src/index.js';
import ac from './cmds/ac.js';
import buttons from './cmds/buttons.js';
import cm from './cmds/cm.js';
import locale_test from './cmds/locale_test.js';
import modal from './cmds/modal.js';
import profile from './cmds/profile.js';
import sub from './cmds/sub.js';
import user from './cmds/user.js';

class TestBot extends Meinu {
	static async create(): Promise<TestBot> {
		const inst = new TestBot({
			owners: [ '211160171945263105' ],
			guildCommands: [ evalc, echo, help, cm, ac, profile, user, sub, modal, buttons, locale_test ],
			specificGuildId: '744006904958812210'
		});
		await inst.init();
		return inst;
	}
}

TestBot.create();
