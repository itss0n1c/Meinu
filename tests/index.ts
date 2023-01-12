import { Meinu } from '../src/index.js';
import cmds from './cmds/index.js';

new Meinu({
	name: 'Meinu',
	owners: [ '211160171945263105' ],
	color: 'LuminousVividPink'
})
	.register_commands(cmds)
	.init();
