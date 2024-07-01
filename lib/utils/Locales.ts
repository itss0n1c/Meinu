import type { Locale as DiscordLocale } from 'discord.js';

type Locale = DiscordLocale | 'default';
export type PartialLocales = Partial<Record<Locale, string>>;

export class Locales extends Map<Locale, string> {
	toJSON(): PartialLocales {
		const obj: PartialLocales = {};
		for (const [key, value] of this) if (key !== 'default') obj[key] = value;
		return obj;
	}

	get default(): string {
		return this.get('default') ?? '';
	}
}

export function setLocales(locales: PartialLocales): Locales {
	return new Locales(Object.entries(locales).map(([key, value]) => [key as Locale, value] as const));
}
