import { echo, evalc, help } from '../src/index.js';

import { Meinu } from '../src/index.js';
import ac from './cmds/ac.js';
import buttons from './cmds/buttons.js';
import cm from './cmds/cm.js';
import modal from './cmds/modal.js';
import profile from './cmds/profile.js';
import sub from './cmds/sub.js';
import user from './cmds/user.js';

class TestBot extends Meinu {
	static async create(): Promise<TestBot> {
		const inst = new TestBot();
		await inst.create({
			owners: [ '211160171945263105' ],
			guildCommands: [ evalc, echo, help, cm, ac, profile, user, sub, modal, buttons ],
			specificGuildId: '744006904958812210'
		});
		return inst;
	}
}

TestBot.create();
