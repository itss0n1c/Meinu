import {
	ActionRowBuilder,
	type APIEmbed,
	type AttachmentBuilder,
	type Awaitable,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type EmbedBuilder,
	type InteractionEditReplyOptions,
	type InteractionReplyOptions,
	type InteractionResponse,
	type Message,
	type MessageComponentInteraction,
	MessagePayload,
	type RepliableInteraction,
	type RoleSelectMenuBuilder,
	type StringSelectMenuBuilder,
	type UserSelectMenuBuilder,
} from 'discord.js';

type ScrollDataType = Array<Record<string, any>>;

type ScrollDataFn<Data extends ScrollDataType> = () => Awaitable<Data>;

export interface MatchedEmbed {
	content?: string;
	embed?: EmbedBuilder | APIEmbed;
	files?: AttachmentBuilder[];
	components?: Array<ActionRowBuilder<ButtonBuilder | AnySelectMenuBuilder>>;
}

type AnySelectMenuBuilder = StringSelectMenuBuilder | RoleSelectMenuBuilder | UserSelectMenuBuilder;

type ScrollEmbedControllable = 'initiator' | 'all';

interface ScrollEmbedData<Data extends ScrollDataType> {
	int: RepliableInteraction;
	show_page_count?: boolean;
	fail_msg?: MatchedEmbed;
	data: ScrollDataFn<Data>;
	controllable?: ScrollEmbedControllable;
	match: (val: Data[number], index: number, array: Data[number][]) => Awaitable<MatchedEmbed>;
}

async function try_prom<T>(prom: Awaitable<T>): Promise<T | undefined> {
	try {
		return await prom;
	} catch (e) {
		console.error(e);
	}
}

export class ScrollEmbed<Data extends ScrollDataType> {
	readonly data: Required<ScrollEmbedData<Data>>;
	embed_data: Data;
	int: RepliableInteraction;
	index = 0;

	reloading = false;

	constructor(data: ScrollEmbedData<Data>, res: Data) {
		this.data = {
			...data,
			fail_msg: data.fail_msg ?? { content: 'Failed to get data.' },
			show_page_count: data.show_page_count ?? false,
			controllable: data.controllable ?? 'initiator',
		};
		this.int = data.int;
		this.embed_data = res;
	}

	current_embed_cache?: MatchedEmbed;

	private async get_embed() {
		if (this.current_embed_cache) return this.current_embed_cache;
		const current_data = this.embed_data.at(this.index);
		if (!current_data) return this.data.fail_msg;
		const current_embed = await try_prom(this.data.match(current_data, this.index, this.embed_data));
		if (!current_embed) return this.data.fail_msg;
		this.current_embed_cache = current_embed;
		return current_embed;
	}

	private async update_reloading(val: boolean) {
		const embed = await this.get_embed();
		this.reloading = val;
		this.int.editReply({ components: this.render_components(embed.components) });
	}

	private current_data_to_payload<Editing extends boolean>(
		data: MatchedEmbed,
		_editing?: Editing,
	): Editing extends true ? InteractionEditReplyOptions : InteractionReplyOptions {
		if (data.content === undefined && data.embed === undefined && data.files === undefined)
			throw new Error('No content, embed or files provided.');
		return {
			...(data.content !== undefined ? { content: data.content } : {}),
			...(data.embed ? { embeds: [data.embed] } : {}),
			files: data.files,
		};
	}

	async reload_data(bint: ButtonInteraction): Promise<void> {
		if (bint) {
			await this.update_reloading(true);
			await bint.deferUpdate();
		}

		this.current_embed_cache = undefined;

		this.embed_data = await this.data.data();
		this.index = 0;

		const current_embed = await this.get_embed();

		const components = this.render_components(current_embed.components);

		await try_prom(
			this.int.editReply({
				components,
				...this.current_data_to_payload(current_embed),
			}),
		);

		if (bint) this.update_reloading(false);
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
		const has_data = !!this.embed_data.length;
		const can_go_back = !this.reloading && has_data && this.index !== 0;
		const can_go_forward = !this.reloading && has_data && this.embed_data.length > this.index + 1;
		const can_reload = !this.reloading;

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
			new ButtonBuilder()
				.setCustomId('scroll_embed_reload')
				.setLabel('↻')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(!can_reload),
			...(this.data.show_page_count && has_data
				? [
						new ButtonBuilder()
							.setCustomId('scroll_embed_page_count')
							.setLabel(`${this.index + 1} / ${this.embed_data.length}`)
							.setStyle(ButtonStyle.Secondary)
							.setDisabled(true),
					]
				: []),
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

		let scroll_embed: Message | InteractionResponse | undefined;

		const current_embed = await this.get_embed();
		const components = this.render_components(current_embed.components);

		if (int.deferred || int.replied) {
			scroll_embed = await try_prom(
				this.int.editReply({
					components,
					...this.current_data_to_payload(current_embed),
				}),
			);
		} else {
			scroll_embed = await try_prom(
				this.int.reply({
					components,
					...this.current_data_to_payload(current_embed, false),
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
			if (this.data.controllable === 'initiator' && bint.user.id !== int.user.id) return bint.deferUpdate();
			if (bint.isButton()) {
				switch (bint.customId) {
					case 'scroll_embed_prev':
						await this.scroll_embed_move('prev', bint);
						break;
					case 'scroll_embed_next':
						await this.scroll_embed_move('next', bint);
						break;
					case 'scroll_embed_reload':
						await this.reload_data(bint);
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

		this.current_embed_cache = undefined;
		const current_embed = await this.get_embed();
		const components = this.render_components(current_embed.components);

		await try_prom(
			this.int.editReply({
				components,
				...this.current_data_to_payload(current_embed),
			}),
		);

		if (bint) await bint.deferUpdate();
	}
}

export const create_scroll_embed = <Data extends ScrollDataType>(data: ScrollEmbedData<Data>) => ScrollEmbed.init(data);
