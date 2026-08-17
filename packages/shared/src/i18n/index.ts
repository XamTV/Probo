import en from './en.json' with { type: 'json' };
import fr from './fr.json' with { type: 'json' };

/**
 * Translations, shared by the Angular app and — later — by the PDF export.
 *
 * They live in the shared package rather than in the web app's assets so a
 * label is authored once. The PDF is generated server side; if the strings
 * lived only in the front end, every label would end up written twice and
 * drift apart.
 *
 * Consequence to keep in mind: both locales are bundled rather than fetched on
 * demand. With two locales and a few hundred keys that costs a few kilobytes,
 * and it buys one fewer HTTP round trip and no asset-copying build step. Worth
 * revisiting past four or five locales.
 */

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

export const TRANSLATIONS: Record<Locale, Record<string, unknown>> = { fr, en };
