import { evalc, Meinu } from '../src';
import sub from './cmds/sub';

Meinu.start({
	owners: [ '211160171945263105' ],
	cmds: [ evalc, sub ],
	testing: true,
	testingGuild: '744006904958812210'
});
