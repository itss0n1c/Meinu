import { EmbedBuilder } from '@discordjs/builders';
import {
	ActionRowBuilder,
	APIEmbed,
	AttachmentBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	InteractionResponse,
	MessageComponentInteraction,
	RepliableInteraction,
	RoleSelectMenuBuilder,
	StringSelectMenuBuilder,
	UserSelectMenuBuilder
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

interface MatchedEmbed {
	files?: AttachmentBuilder[];
}

type ExtraButton<Data extends ScrollDataType> = ExtraButtonBase<Data> & (ExtraButtonLink | ExtraButtonLabel | ExtraButtonEmoji);

type AnySelectMenuBuilder = StringSelectMenuBuilder | RoleSelectMenuBuilder | UserSelectMenuBuilder;

interface ScrollEmbedData<Data extends ScrollDataType> {
	int: RepliableInteraction;
	data: ScrollDataFn<Data>;
	// eslint-disable-next-line no-unused-vars
	match: (val: Data[number], index: number, array: Data[number][]) => Omit<APIEmbed, 'footer' | 'type'>;
	// eslint-disable-next-line no-unused-vars
	match_embed?: (val: Data[number], index: number) => MatchedEmbed;
	buttons?: ExtraButton<Data>[];
	extra_row?: ActionRowBuilder<ButtonBuilder | AnySelectMenuBuilder>;
}

// eslint-disable-next-line no-unused-vars
const try_prom = <T>(prom: Promise<T>) => prom.catch();

export class ScrollEmbed<Data extends ScrollDataType> {
	readonly data: Required<ScrollEmbedData<Data>>;
	embed_data: Data;
	embeds: Array<EmbedBuilder>;
	embed_datas: Array<MatchedEmbed>;
	int: RepliableInteraction;
	index = 0;
	components: Array<ActionRowBuilder<ButtonBuilder | AnySelectMenuBuilder>> = [];
	constructor(data: ScrollEmbedData<Data>, res: Data) {
		this.data = {
			...data,
			buttons: data.buttons ?? [],
			match_embed: data.match_embed ?? (() => ({})),
			extra_row: data.extra_row ?? new ActionRowBuilder()
		};
		this.int = data.int;
		this.embed_data = res;
		this.embeds = res.map(data.match).map((e, i) =>
			new EmbedBuilder(e).setFooter({
				text: `${i + 1}/${res.length}`
			})
		);
		this.embed_datas = res.map(this.data.match_embed);
	}

	async reload_data({ data, bint }: { data?: ScrollDataFn<Data>; bint?: ButtonInteraction } = {}): Promise<void> {
		if (data) {
			this.data.data = data;
		}
		this.embed_data = await this.data.data();
		this.embeds = this.embed_data.map(this.data.match).map((e, i) =>
			new EmbedBuilder(e).setFooter({
				text: `${i + 1}/${this.embed_data.length}`
			})
		);
		this.embed_datas = this.embed_data.map(this.data.match_embed);

		this.index = 0;
		this.components[0].components[0].setDisabled(this.index === 0);
		this.components[0].components[1].setDisabled(this.index === this.embeds.length - 1);
		await try_prom(
			this.int.editReply({
				embeds: [ this.embeds[this.index] ],
				components: this.components,
				files: this.embed_datas[this.index].files
			})
		);
		if (bint) {
			await bint.deferUpdate();
		}
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
			this.components.push(row);
		}

		if (this.data.extra_row && this.data.extra_row.components.length > 0) {
			this.components.push(this.data.extra_row);
		}

		let scroll_embed;
		console.log(int.deferred, int.replied);
		if (int.deferred || int.replied) {
			scroll_embed = await try_prom(
				this.int.editReply({
					embeds: [ this.embeds[0] ],
					components: this.components,
					files: this.embed_datas[0].files
				})
			);
		} else {
			scroll_embed = await try_prom(
				this.int.reply({
					embeds: [ this.embeds[0] ],
					components: this.components,
					files: this.embed_datas[0].files
				})
			);
		}
		console.log(scroll_embed);

		if (!scroll_embed) {
			throw new Error('Scroll Embed failed to send.');
		}

		const filter = (i: MessageComponentInteraction) =>
			i.customId === 'scroll_embed_prev' ||
			i.customId === 'scroll_embed_next' ||
			i.customId === 'scroll_embed_reload' ||
			buttons.some((b) => b.id === i.customId);
		const collector = scroll_embed.createMessageComponentCollector({ filter });
		collector.on('collect', async (bint) => {
			if (bint.isButton()) {
				const find = buttons.find((b) => b.id === bint.customId);
				if (find) {
					await find.action(bint, this.embed_data[this.index]);
				}
				switch (bint.customId) {
					case 'scroll_embed_prev':
						await this.scroll_embed_move('prev', bint);
						break;
					case 'scroll_embed_next':
						await this.scroll_embed_move('next', bint);
						break;
					case 'scroll_embed_reload':
						await this.reload_data({ bint });
						break;
				}
			}
		});

		return this;
	}

	async scroll_embed_move(action: 'prev' | 'next', bint?: ButtonInteraction) {
		switch (action) {
			case 'prev':
				if (this.index > 0) {
					this.index--;
				}
				break;
			case 'next':
				if (this.index < this.embeds.length - 1) {
					this.index++;
				}
				break;
		}

		this.components[0].components[0].setDisabled(this.index === 0);
		this.components[0].components[1].setDisabled(this.index === this.embeds.length - 1);
		await try_prom(
			this.int.editReply({
				embeds: [ this.embeds[this.index] ],
				components: this.components,
				files: this.embed_datas[this.index].files
			})
		);

		if (bint) {
			await bint.deferUpdate();
		}
	}
}

export async function create_scroll_embed<Data extends ScrollDataType>(data: ScrollEmbedData<Data>) {
	const scroll = await ScrollEmbed.init(data);
	return scroll.init();
}
