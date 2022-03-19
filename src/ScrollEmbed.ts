/* eslint-disable no-unused-vars */
import { ApplicationCommandOptionData, Interaction, MessageEmbed } from '.';
import Meinu, { Command } from '.';
import { CommandInteraction } from 'discord.js';

export interface ScrollEmbedRes<Data> {
	embed: MessageEmbed
	data: Data[]
}

export type ScrollGenData<Bot, Data> = (bot: Bot, int: CommandInteraction) => Data[] | Promise<Data[]>
export type ScrollGenEmbed<Bot, Data> = (bot: Bot, data: Data[], page: number) => MessageEmbed | Promise<MessageEmbed>

export interface ScrollEmbedInfo<Bot, Data> {
	name: string
	description: string
	genData: ScrollGenData<Bot, Data>
	genEmbed: ScrollGenEmbed<Bot, Data>
	options?: ApplicationCommandOptionData[]
}

export default class ScrollEmbed<Data = any, Bot = Meinu> extends Command<Bot> {
	genData: ScrollGenData<Bot, Data>
	genEmbed: ScrollGenEmbed<Bot, Data>
	constructor(opts: ScrollEmbedInfo<Bot, Data>) {
		super({ name: opts.name,
			description: opts.description,
			buttons: [
				{
					label: '←',
					customId: 'left',
					style: 'SECONDARY'
				},
				{
					label: '→',
					customId: 'right',
					style: 'SECONDARY'
				}
			],
			options: opts.options });
		this.genData = opts.genData;
		this.genEmbed = opts.genEmbed;
		this.init();
	}

	async handleInteraction(bot: Bot, int: Interaction): Promise<void> {
		if (int.isButton()) {
			if (int.message.interaction.user.id !== int.user.id) {
				return int.reply({ content: 'Can\'t do that.',
					ephemeral: true });
			}
			const interaction = this.interactions.get(int.message.interaction.id);
			const data = await this.genData(bot, interaction);
			const num = parseInt(int.message.embeds[0].title.match(/(?<=\()\d+/g)[0]);
			let embed: MessageEmbed;
			let newnum: string;
			switch (int.customId) {
				case 'left':

					if (num === 1) {
						return int.reply({ content: 'Can\'t do that',
							ephemeral: true });
					}
					embed = await this.genEmbed(bot, data, num - 1);
					newnum = (num - 1).toString();
					break;
				case 'right':
					if (num === data.length) {
						return int.reply({ content: 'Can\'t do that',
							ephemeral: true });
					}
					embed = await this.genEmbed(bot, data, num + 1);
					newnum = (num + 1).toString();
					break;
			}
			embed.setTitle(`${embed.title} (${newnum}/${data.length})`)
				.setColor((bot as unknown as Meinu).color)
				.setFooter(interaction.user.tag, interaction.user.displayAvatarURL({
					dynamic: true,
					format: 'png'
				}))
				.setTimestamp(new Date());
			int.update({ embeds: [ embed ] });
		}
	}

	async init(): Promise<void> {
		this.response = async (bot, int) => {
			const data = await this.genData(bot, int);
			const embed = await this.genEmbed(bot, data, 1);
			embed.setTitle(`${embed.title} (1/${data.length})`);
			return embed;
		};
	}
}
