import {
	ActionRowBuilder,
	type APIEmbed,
	type AttachmentBuilder,
	type Awaitable,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type EmbedBuilder,
	type InteractionResponse,
	type Message,
	type MessageComponentInteraction,
	type RepliableInteraction,
	type RoleSelectMenuBuilder,
	type StringSelectMenuBuilder,
	type UserSelectMenuBuilder,
} from 'discord.js';

type ScrollDataType = Array<Record<string, any>>;

type ScrollDataFn<Data extends ScrollDataType> = () => Awaitable<Data>;

export interface MatchedEmbed {
	embed: EmbedBuilder | APIEmbed;
	files?: AttachmentBuilder[];
	components?: Array<ActionRowBuilder<ButtonBuilder | AnySelectMenuBuilder>>;
}

type AnySelectMenuBuilder = StringSelectMenuBuilder | RoleSelectMenuBuilder | UserSelectMenuBuilder;

interface ScrollEmbedData<Data extends ScrollDataType> {
	int: RepliableInteraction;
	data: ScrollDataFn<Data>;
	// eslint-disable-next-line no-unused-vars
	match: (val: Data[number], index: number, array: Data[number][]) => Awaitable<MatchedEmbed>;
}

// eslint-disable-next-line no-unused-vars
const try_prom = <T>(prom: Awaitable<T>) =>
	prom instanceof Promise ? ((prom as Promise<T>).catch((e) => console.error(e)) as Promise<T>) : (prom as T);

export class ScrollEmbed<Data extends ScrollDataType> {
	readonly data: Required<ScrollEmbedData<Data>>;
	embed_data: Data;
	int: RepliableInteraction;
	index = 0;
	constructor(data: ScrollEmbedData<Data>, res: Data) {
		this.data = { ...data };
		this.int = data.int;
		this.embed_data = res;
	}

	async reload_data({ data, bint }: { data?: ScrollDataFn<Data>; bint?: ButtonInteraction } = {}): Promise<void> {
		if (data) this.data.data = data;

		this.embed_data = await this.data.data();
		this.index = 0;

		const current_data = this.embed_data[this.index];
		const current_embed = await try_prom(this.data.match(current_data, this.index, this.embed_data));

		const components = this.render_components(current_embed.components);

		const current_embed_data = {
			embeds: [current_embed.embed],
			files: current_embed.files,
		};

		await try_prom(
			this.int.editReply({
				components,
				...current_embed_data,
			}),
		);
		if (bint) await bint.deferUpdate();
	}

	static async init<Data extends ScrollDataType>(data: ScrollEmbedData<Data>): Promise<ScrollEmbed<Data>> {
		const res = await data.data();
		const inst = new ScrollEmbed(data, res);
		return inst.init();
	}

	private render_components(
		extra_rows?: MatchedEmbed['components'],
	): Array<ActionRowBuilder<ButtonBuilder | AnySelectMenuBuilder>> {
		const rows: ActionRowBuilder<ButtonBuilder | AnySelectMenuBuilder>[] = [];
		const can_go_back = this.index !== 0;
		const can_go_forward = this.embed_data.length > this.index + 1;

		if (extra_rows) rows.push(...extra_rows);

		const btns = [
			new ButtonBuilder()
				.setCustomId('scroll_embed_prev')
				.setLabel('←')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(!can_go_back),
			new ButtonBuilder()
				.setCustomId('scroll_embed_next')
				.setLabel('→')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(!can_go_forward),
			new ButtonBuilder().setCustomId('scroll_embed_reload').setLabel('↻').setStyle(ButtonStyle.Secondary),
		];

		const chunks = [];
		for (let i = 0; i < btns.length; i += 5) chunks.push(btns.slice(i, i + 5));

		for (const chunk of chunks) {
			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(chunk);
			rows.push(row);
		}

		return rows;
	}

	private async init(): Promise<this> {
		const { int } = this.data;
		if (!int.isRepliable()) throw new Error('Interaction is not repliable.');

		let scroll_embed: Message | InteractionResponse;

		const current_data = this.embed_data[this.index];
		const current_embed = await try_prom(this.data.match(current_data, this.index, this.embed_data));
		const components = this.render_components(current_embed.components);

		const current_embed_data = {
			embeds: [current_embed.embed],
			files: current_embed.files,
		};
		if (int.deferred || int.replied) {
			scroll_embed = await try_prom(
				this.int.editReply({
					components,
					...current_embed_data,
				}),
			);
		} else {
			scroll_embed = await try_prom(
				this.int.reply({
					components,
					...current_embed_data,
				}),
			);
		}

		if (!scroll_embed) throw new Error('Scroll Embed failed to send.');

		const filter = (i: MessageComponentInteraction) =>
			i.customId === 'scroll_embed_prev' ||
			i.customId === 'scroll_embed_next' ||
			i.customId === 'scroll_embed_reload';
		const collector = scroll_embed.createMessageComponentCollector({ filter });
		collector.on('collect', async (bint) => {
			if (bint.isButton()) {
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

	private async scroll_embed_move(action: 'prev' | 'next', bint?: ButtonInteraction) {
		switch (action) {
			case 'prev':
				if (this.index > 0) this.index--;
				break;
			case 'next':
				if (this.index < this.embed_data.length - 1) this.index++;
				break;
		}

		const current_data = this.embed_data[this.index];
		const current_embed = await try_prom(this.data.match(current_data, this.index, this.embed_data));
		const components = this.render_components(current_embed.components);

		const current_embed_data = {
			embeds: [current_embed.embed],
			files: current_embed.files,
		};
		await try_prom(
			this.int.editReply({
				components,
				...current_embed_data,
			}),
		);

		if (bint) await bint.deferUpdate();
	}
}

export async function create_scroll_embed<Data extends ScrollDataType>(data: ScrollEmbedData<Data>) {
	return ScrollEmbed.init(data);
}
