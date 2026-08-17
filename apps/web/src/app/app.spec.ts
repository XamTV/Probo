import { TestBed } from '@angular/core/testing';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { DEFAULT_LOCALE, LOCALES } from '@probo/shared';
import { App } from './app';
import { SharedTranslocoLoader } from './i18n/transloco-loader';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideTransloco({
          config: {
            availableLangs: [...LOCALES],
            defaultLang: DEFAULT_LOCALE,
            fallbackLang: DEFAULT_LOCALE,
            reRenderOnLangChange: true,
          },
          loader: SharedTranslocoLoader,
        }),
      ],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture;
  }

  it('mounts the root component', async () => {
    const fixture = await render();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders French by default', async () => {
    const fixture = await render();
    const rendered = fixture.nativeElement as HTMLElement;
    expect(rendered.querySelector('h1')?.textContent).toContain('Probo');
    expect(rendered.textContent).toContain('Lettre de motivation');
  });

  it('translates enum values through their key rather than a hardcoded label', async () => {
    const fixture = await render();
    const rendered = fixture.nativeElement as HTMLElement;

    // The raw value stays visible next to its label on this foundation screen.
    expect(rendered.textContent).toContain('COVER_LETTER');
    expect(rendered.textContent).not.toContain('documentType.COVER_LETTER');
  });

  it('switches the whole interface to English', async () => {
    const fixture = await render();
    TestBed.inject(TranslocoService).setActiveLang('en');
    await fixture.whenStable();

    const rendered = fixture.nativeElement as HTMLElement;
    expect(rendered.textContent).toContain('Cover letter');
    expect(rendered.textContent).not.toContain('Lettre de motivation');
  });
});
