import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { DEFAULT_LOCALE, LOCALES, PASSWORD_MIN_LENGTH } from '@probo/shared';

import { SharedTranslocoLoader } from '../i18n/transloco-loader';
import { AcceptInvitation } from './accept-invitation';

const TOKEN = 'a'.repeat(43);

/** Reaches the form without widening its visibility for production. */
interface Internals {
  form: { setValue: (value: { password: string }) => void };
  submit: () => Promise<void>;
}

/** US-02 — where an invitation link lands. */
describe('AcceptInvitation', () => {
  let fixture: ComponentFixture<AcceptInvitation>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcceptInvitation],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map([['token', TOKEN]]) } },
        },
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

    fixture = TestBed.createComponent(AcceptInvitation);
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;
  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it('sends the token in the body, never in the URL', async () => {
    internals().form.setValue({ password: 'b'.repeat(PASSWORD_MIN_LENGTH) });
    void internals().submit();

    const req = http.expectOne('/api/auth/invitation');
    expect(req.request.url).not.toContain(TOKEN);
    expect(req.request.body.token).toBe(TOKEN);
  });

  it(`refuses a password under ${PASSWORD_MIN_LENGTH} characters without asking the server`, async () => {
    internals().form.setValue({ password: 'short' });
    await internals().submit();

    http.expectNone('/api/auth/invitation');
  });

  it('says a refused link is no longer valid, and nothing more', async () => {
    internals().form.setValue({ password: 'b'.repeat(PASSWORD_MIN_LENGTH) });
    void internals().submit();

    http.expectOne('/api/auth/invitation').flush(null, { status: 401, statusText: 'Unauthorized' });
    await fixture.whenStable();
    fixture.detectChanges();

    // Spent, expired and never issued look the same from here: telling them
    // apart would say whether a token ever existed.
    expect(text()).toContain("Ce lien n'est plus valable");
  });

  it('resolves every label through a key rather than hardcoding it', async () => {
    TestBed.inject(TranslocoService).setActiveLang('en');
    fixture.detectChanges();

    expect(text()).toContain('Choose your password');
    expect(text()).not.toContain('Choisissez');
  });
});
