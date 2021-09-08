import Meinu from '../src';
import cm from './cmds/cm';
import color from './cmds/color';
import profile from './cmds/profile';
import user from './cmds/user';

new Meinu({
	owners: [ '211160171945263105' ],
	cmds: [ cm, color, user, profile ]
});
