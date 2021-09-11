import Meinu from '../src';
import cm from './cmds/cm';
import color from './cmds/color';
import profile from './cmds/profile';
import scroll from './cmds/scroll';
import user from './cmds/user';

new Meinu({
	owners: [ '211160171945263105' ],
	cmds: [ cm, color, user, profile, scroll ],
	testing: true,
	testingGuild: '744006904958812210'
});
