import { EmbedBuilder } from '@discordjs/builders';
import {
	ActionRowBuilder,
	APIEmbed,
	BaseInteraction,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	InteractionResponse,
	MessageComponentInteraction
} from 'discord.js';

type ScrollDataType = Array<Record<string, any>>;

type ScrollDataFn<Data extends ScrollDataType> = () => Data | Promise<Data>;

interface ExtraButtonBase<Data extends ScrollDataType> {
	id: string;
	// eslint-disable-next-line no-unused-vars
	action: (int: ButtonInteraction, current_val: Data[0]) => void | Promise<InteractionResponse | void>;
	style: ButtonStyle;
}

interface ExtraButtonLabel {
	label: string;
}

interface ExtraButtonEmoji {
	emoji: string;
}

interface ExtraButtonLink extends ExtraButtonLabel, ExtraButtonEmoji {
	url: string;
	style: ButtonStyle.Link;
}

type ExtraButton<Data extends ScrollDataType> = ExtraButtonBase<Data> & (ExtraButtonLink | ExtraButtonLabel | ExtraButtonEmoji);

interface ScrollEmbedData<Data extends ScrollDataType> {
	int: BaseInteraction;
	data: ScrollDataFn<Data>;
	// eslint-disable-next-line no-unused-vars
	match: (val: Data[number]) => Omit<APIEmbed, 'footer' | 'type'>;
	buttons?: ExtraButton<Data>[];
}

class ScrollEmbed<Data extends ScrollDataType> {
	readonly data: Required<ScrollEmbedData<Data>>;
	embed_data: Data;
	embeds: Array<EmbedBuilder>;
	constructor(data: ScrollEmbedData<Data>, res: Data) {
		this.data = {
			...data,
			buttons: data.buttons ?? []
		};
		this.embed_data = res;
		this.embeds = res.map(data.match).map((e, i) =>
			new EmbedBuilder(e).setFooter({
				text: `${i + 1}/${res.length}`
			})
		);
	}

	async reload_data(): Promise<Data> {
		this.embed_data = await this.data.data();
		this.embeds = this.embed_data.map(this.data.match).map((e, i) =>
			new EmbedBuilder(e).setFooter({
				text: `${i + 1}/${this.embed_data.length}`
			})
		);
		return this.embed_data;
	}

	static async init<Data extends ScrollDataType>(data: ScrollEmbedData<Data>): Promise<ScrollEmbed<Data>> {
		const res = await data.data();
		const inst = new ScrollEmbed(data, res);

		return inst;
	}

	async init(): Promise<this> {
		const { int, buttons } = this.data;
		if (!int.isRepliable()) {
			throw new Error('Interaction is not repliable.');
		}

		const components: ActionRowBuilder<ButtonBuilder>[] = [];

		const btns: ButtonBuilder[] = [
			new ButtonBuilder().setCustomId('scroll_embed_prev').setLabel('←').setStyle(ButtonStyle.Secondary).setDisabled(true),
			new ButtonBuilder().setCustomId('scroll_embed_next').setLabel('→').setStyle(ButtonStyle.Secondary),
			new ButtonBuilder().setCustomId('scroll_embed_reload').setLabel('↻').setStyle(ButtonStyle.Secondary)
		];
		for (const btn of buttons) {
			if (btn) {
				const button = new ButtonBuilder().setCustomId(btn.id);
				if ('url' in btn) {
					button.setURL(btn.url).setLabel(btn.label);
				}
				if ('emoji' in btn || 'label' in btn) {
					button.setStyle(btn.style);
				}
				if ('emoji' in btn) {
					button.setEmoji(btn.emoji);
				}
				if ('label' in btn) {
					button.setLabel(btn.label);
				}
				btns.push(button);
			}
		}

		const chunks = [];
		for (let i = 0; i < btns.length; i += 5) {
			chunks.push(btns.slice(i, i + 5));
		}

		for (const chunk of chunks) {
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(chunk);
			components.push(row);
		}

		let scroll_embed;
		if (int.deferred || int.replied) {
			scroll_embed = await int.editReply({
				embeds: [ this.embeds[0] ],
				components
			});
		} else {
			scroll_embed = await int.reply({
				embeds: [ this.embeds[0] ],
				components
			});
		}

		const filter = (i: MessageComponentInteraction) =>
			i.customId === 'scroll_embed_prev' ||
			i.customId === 'scroll_embed_next' ||
			i.customId === 'scroll_embed_reload' ||
			buttons.some((b) => b.id === i.customId);
		const collector = scroll_embed.createMessageComponentCollector({ filter });
		let index = 0;
		collector.on('collect', async (bint) => {
			if (bint.isButton()) {
				const find = buttons.find((b) => b.id === bint.customId);
				if (find) {
					await find.action(bint, this.embed_data[index]);
				}
				switch (bint.customId) {
					case 'scroll_embed_prev':
						if (index > 0) {
							index--;
							components[0].components[0].setDisabled(index === 0);
							components[0].components[1].setDisabled(index === this.embeds.length - 1);
							await int.editReply({
								embeds: [ this.embeds[index] ],
								components
							});
						}
						await bint.deferUpdate();
						break;
					case 'scroll_embed_next':
						if (index < this.embeds.length - 1) {
							index++;
							components[0].components[0].setDisabled(index === 0);
							components[0].components[1].setDisabled(index === this.embeds.length - 1);
							await int.editReply({
								embeds: [ this.embeds[index] ],
								components
							});
						}
						await bint.deferUpdate();
						break;
					case 'scroll_embed_reload':
						await this.reload_data();
						index = 0;
						components[0].components[0].setDisabled(index === 0);
						components[0].components[1].setDisabled(index === this.embeds.length - 1);
						await int.editReply({
							embeds: [ this.embeds[index] ],
							components
						});
						await bint.deferUpdate();
				}
			}
		});

		return this;
	}
}

export async function create_scroll_embed<Data extends ScrollDataType>(data: ScrollEmbedData<Data>) {
	const scroll = await ScrollEmbed.init(data);
	await scroll.init();
}
