import { TestBed } from '@angular/core/testing';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { DEFAULT_LOCALE, LOCALES } from '@probo/shared';
import { LocaleService } from './locale.service';
import { SharedTranslocoLoader } from './transloco-loader';

describe('LocaleService', () => {
  const originalLanguage = navigator.language;

  /** jsdom reports en-US by default, so the browser preference is pinned per test. */
  function withBrowserLanguage(tag: string): void {
    Object.defineProperty(window.navigator, 'language', { value: tag, configurable: true });
  }

  function service(): LocaleService {
    TestBed.configureTestingModule({
      providers: [
        provideTransloco({
          config: {
            availableLangs: [...LOCALES],
            defaultLang: DEFAULT_LOCALE,
            fallbackLang: DEFAULT_LOCALE,
          },
          loader: SharedTranslocoLoader,
        }),
      ],
    });

    return TestBed.inject(LocaleService);
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  afterEach(() => {
    withBrowserLanguage(originalLanguage);
  });

  describe('resolution order: stored choice, then browser, then default', () => {
    it('uses the browser preference when it is supported', () => {
      withBrowserLanguage('en-GB');

      const locale = service();
      locale.initialise();

      expect(locale.locale()).toBe('en');
    });

    it('falls back to the default locale when the browser language is unsupported', () => {
      withBrowserLanguage('de-DE');

      const locale = service();
      locale.initialise();

      expect(locale.locale()).toBe(DEFAULT_LOCALE);
    });

    it('an explicit stored choice wins over the browser preference', () => {
      withBrowserLanguage('fr-FR');
      localStorage.setItem('probo.locale', 'en');

      const locale = service();
      locale.initialise();

      expect(locale.locale()).toBe('en');
    });

    it('ignores a stored value that is not a supported locale', () => {
      withBrowserLanguage('de-DE');
      localStorage.setItem('probo.locale', 'de');

      const locale = service();
      locale.initialise();

      expect(locale.locale()).toBe(DEFAULT_LOCALE);
    });
  });

  it('persists the choice and drives the Transloco active language', () => {
    const locale = service();
    locale.initialise();
    locale.set('en');

    expect(localStorage.getItem('probo.locale')).toBe('en');
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
  });

  it('declares the language on the document, as RGAA requires', () => {
    const locale = service();
    locale.initialise();
    locale.set('en');

    expect(document.documentElement.lang).toBe('en');
  });
});
