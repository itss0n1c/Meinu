import { Meinu } from '../src/index.js';
import cmds from './cmds/index.js';

new Meinu({
	name: 'Meinu',
	color: 'LuminousVividPink'
})
	.register_commands(cmds)
	.init();
