# Meinu

<a href="https://discord.gg/8bt5dbycDM"><img src="https://img.shields.io/discord/977286501756968971?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
<a href="https://www.npmjs.com/package/meinu"><img src="https://img.shields.io/npm/v/meinu?maxAge=3600" alt="npm version" /></a>
<a href="https://www.npmjs.com/package/meinu"><img src="https://img.shields.io/npm/dt/meinu.svg?maxAge=3600" alt="npm downloads" /></a>

### A discord.js wrapper, with a focus on slash commands.

## Installation

```zsh
% bun add meinu
```

## Usage

```ts
import { Meinu, Command } from 'meinu';

let commands = [
	new Command<Meinu>({
		name: 'ping',
		description: 'Pong!',
		dmPermission: true, // default: false
		ownersOnly: true, // default: false
		nsfw: true, // default: false
		global: true, // default: false
	}).addHandler('chatInput', async (bot, int) => {
		const sent = await int.deferReply({
			fetchReply: true
		});
		const diff = sent.createdTimestamp - int.createdTimestamp;
		return int.editReply({
			content: `🏓 Pong! ${diff}ms`
		});
	})
];

new Meinu({
	name: 'MyBot',
	color: 'LuminousVividPink',
})
	.register_commands(commands) // registers commands per guild, Command.global for global commands
	.init(); // starts the bot, .init(TOKEN) if process.env.TOKEN is not set
```
