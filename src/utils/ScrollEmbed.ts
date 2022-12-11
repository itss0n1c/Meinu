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

interface ExtraButtonBase {
	id: string;
	// eslint-disable-next-line no-unused-vars
	action: (int: ButtonInteraction) => void | Promise<InteractionResponse | void>;
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

type ExtraButton = ExtraButtonBase & (ExtraButtonLink | ExtraButtonLabel | ExtraButtonEmoji);

interface ScrollEmbedData<Data extends ScrollDataType> {
	int: BaseInteraction;
	data: Data;
	// eslint-disable-next-line no-unused-vars
	match: (val: Data[number]) => Omit<APIEmbed, 'footer' | 'type'>;
	buttons?: ExtraButton[];
}

class ScrollEmbed<Data extends ScrollDataType> {
	readonly data: Required<ScrollEmbedData<Data>>;
	embeds: Array<EmbedBuilder>;
	constructor(data: ScrollEmbedData<Data>) {
		this.data = {
			...data,
			buttons: data.buttons ?? []
		};
		this.embeds = data.data.map(data.match).map((e, i) =>
			new EmbedBuilder(e).setFooter({
				text: `${i + 1}/${data.data.length}`
			})
		);
	}

	async init(): Promise<this> {
		const { int, buttons } = this.data;
		if (!int.isRepliable()) {
			throw new Error('Interaction is not repliable.');
		}
		if (int.replied) {
			throw new Error('Interaction has already been replied to.');
		}

		const components: ActionRowBuilder<ButtonBuilder>[] = [];

		const btns: ButtonBuilder[] = [
			new ButtonBuilder().setCustomId('scroll_embed_prev').setLabel('←').setStyle(ButtonStyle.Secondary).setDisabled(true),
			new ButtonBuilder().setCustomId('scroll_embed_next').setLabel('→').setStyle(ButtonStyle.Secondary)
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

		const msg = await int.reply({
			embeds: [ this.embeds[0] ],
			components,
			fetchReply: true
		});

		const filter = (i: MessageComponentInteraction) =>
			i.customId === 'scroll_embed_prev' || i.customId === 'scroll_embed_next' || buttons.some((b) => b.id === i.customId);
		const collector = msg.createMessageComponentCollector({ filter });
		let index = 0;
		collector.on('collect', async (bint) => {
			if (bint.isButton()) {
				const find = buttons.find((b) => b.id === bint.customId);
				if (find) {
					await find.action(bint);
				}
				switch (bint.customId) {
					case 'scroll_embed_prev':
						if (index > 0) {
							index--;
							components[0].components[0].setDisabled(index === 0);
							components[0].components[1].setDisabled(index === this.embeds.length - 1);
							await msg.edit({
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
							await msg.edit({
								embeds: [ this.embeds[index] ],
								components
							});
						}
						await bint.deferUpdate();
						break;
				}
			}
		});

		return this;
	}
}

export async function create_scroll_embed<Data extends ScrollDataType>(data: ScrollEmbedData<Data>) {
	const scroll = new ScrollEmbed(data);
	await scroll.init();
}
