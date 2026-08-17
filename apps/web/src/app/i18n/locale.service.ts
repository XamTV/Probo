import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { DEFAULT_LOCALE, LOCALES, Locale } from '@probo/shared';

const STORAGE_KEY = 'probo.locale';

/**
 * Owns the active locale: resolution, persistence, and the `lang` attribute on
 * the document.
 *
 * Keeping `<html lang>` in sync is not cosmetic — screen readers pick their
 * pronunciation from it, and RGAA requires the page language to be declared.
 */
@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  private readonly currentLocale = signal<Locale>(DEFAULT_LOCALE);

  /** Active locale, readable from templates. */
  readonly locale = this.currentLocale.asReadonly();

  readonly available = LOCALES;

  /**
   * Resolution order: explicit user choice, then browser preference, then
   * default. A visitor whose browser is in English gets English on first load;
   * once they choose, their choice wins for good.
   */
  initialise(): void {
    this.apply(this.stored() ?? this.fromBrowser() ?? DEFAULT_LOCALE, false);
  }

  set(locale: Locale): void {
    this.apply(locale, true);
  }

  private apply(locale: Locale, persist: boolean): void {
    this.currentLocale.set(locale);
    this.transloco.setActiveLang(locale);
    this.document.documentElement.lang = locale;

    if (persist) {
      try {
        this.document.defaultView?.localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        // Private browsing or storage disabled: the choice simply lasts for
        // this session rather than failing the language switch.
      }
    }
  }

  private stored(): Locale | null {
    try {
      const value = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return this.isSupported(value) ? value : null;
    } catch {
      return null;
    }
  }

  private fromBrowser(): Locale | null {
    const tag = this.document.defaultView?.navigator.language?.slice(0, 2).toLowerCase();
    return this.isSupported(tag) ? tag : null;
  }

  private isSupported(value: string | null | undefined): value is Locale {
    return value != null && (LOCALES as readonly string[]).includes(value);
  }
}
