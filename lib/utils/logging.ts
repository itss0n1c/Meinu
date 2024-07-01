import type { Awaitable } from 'discord.js';
import chalk from 'chalk';

export const meinu_color = chalk.rgb(114, 137, 218);

export async function _meinu_log(
	{
		title,
		cb,
	}: {
		title: string;
		cb?: Awaitable<any>;
	},
	...message: any[]
) {
	if (typeof cb === 'undefined') return console.log(meinu_color(`[Meinu / ${title}]`), ...message);
	console.time(...message);
	await cb;
	console.timeEnd(...message);
}

const { green, red } = chalk;

export { green, red };
