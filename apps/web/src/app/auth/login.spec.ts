import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { DEFAULT_LOCALE, LOCALES } from '@probo/shared';

import { SharedTranslocoLoader } from '../i18n/transloco-loader';
import { Login } from './login';

/**
 * The sign-in screen is the first one a visitor sees, so it is where the
 * bilingual interface is exercised end to end. These assertions moved here
 * from the old foundation screen, which the router shell replaced.
 */
describe('Login', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
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
    const fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    return fixture;
  }

  it('mounts the screen', async () => {
    const fixture = await render();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders French by default', async () => {
    const rendered = (await render()).nativeElement as HTMLElement;
    // The French interface says "Connexion" while the component is named
    // Login: the rendered word comes from a translation key, not from the code.
    expect(rendered.querySelector('h1')?.textContent).toContain('Connexion');
    expect(rendered.textContent).toContain('Adresse email');
  });

  it('resolves every label through a key rather than hardcoding it', async () => {
    const rendered = (await render()).nativeElement as HTMLElement;
    expect(rendered.textContent).not.toContain('auth.');
    expect(rendered.textContent).not.toContain('app.tagline');
  });

  it('switches the whole interface to English', async () => {
    const fixture = await render();
    TestBed.inject(TranslocoService).setActiveLang('en');
    await fixture.whenStable();

    const rendered = fixture.nativeElement as HTMLElement;
    expect(rendered.textContent).toContain('Email address');
    expect(rendered.textContent).not.toContain('Adresse email');
  });

  it('labels both inputs, which a screen reader needs to announce them', async () => {
    const rendered = (await render()).nativeElement as HTMLElement;
    for (const id of ['email', 'password']) {
      expect(rendered.querySelector(`label[for="${id}"]`)).not.toBeNull();
      expect(rendered.querySelector(`input#${id}`)).not.toBeNull();
    }
  });

  it('US-01: says nothing about whether the address exists', async () => {
    const fixture = await render();
    const component = fixture.componentInstance as unknown as {
      failed: { set: (v: boolean) => void };
    };
    component.failed.set(true);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Identifiants incorrects.');
    // One message, whatever the cause. Anything naming the account or the
    // password separately would turn the form into an oracle.
    expect(text).not.toContain('inconnu');
    expect(text).not.toContain('existe');
  });
});
