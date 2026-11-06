import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TranslocoService, provideTransloco } from '@jsverse/transloco';
import { DEFAULT_LOCALE, LOCALES } from '@probo/shared';

import { SessionService } from '../auth/session.service';
import { SharedTranslocoLoader } from '../i18n/transloco-loader';
import { UserList } from './user-list';
import type { AccountView } from './users.service';

const ACCOUNTS: AccountView[] = [
  {
    id: 'u1',
    email: 'marc@esm.test',
    name: 'Marc Delaunay',
    role: 'ADMIN',
    isActive: true,
    state: 'ACTIVE',
    lastLoginAt: '2026-11-06T08:40:00.000Z',
    createdAt: '2026-08-01T08:00:00.000Z',
    invitationExpiresAt: null,
  },
  {
    id: 'u2',
    email: 'sofiane@esm.test',
    name: 'Sofiane Hamdi',
    role: 'ADMISSIONS_OFFICER',
    isActive: true,
    state: 'INVITED',
    lastLoginAt: null,
    createdAt: '2026-11-05T08:00:00.000Z',
    invitationExpiresAt: '2026-11-12T08:00:00.000Z',
  },
];

/** Reaches the form without widening its visibility for production. */
interface Internals {
  form: { setValue: (value: Record<string, string>) => void };
  submit: () => Promise<void>;
}

/** US-02 — the accounts screen, specified by Comptes.dc.html. */
describe('UserList', () => {
  let http: HttpTestingController;
  let fixture: ComponentFixture<UserList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // The screen only ever asks the session who is signed in, which is
        // what decides whether it offers anything to click.
        {
          provide: SessionService,
          useValue: {
            user: signal({
              id: 'u1',
              institutionId: 'i1',
              email: 'marc@esm.test',
              name: 'Marc Delaunay',
              role: 'ADMIN',
            }),
          },
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
  });

  async function render(accounts: AccountView[] = ACCOUNTS): Promise<ComponentFixture<UserList>> {
    fixture = TestBed.createComponent(UserList);
    http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.method === 'GET' && r.url === '/api/users').flush(accounts);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const text = (f: ComponentFixture<UserList>): string =>
    (f.nativeElement as HTMLElement).textContent ?? '';

  it('tells an invited account apart from an active one', async () => {
    const f = await render();

    expect(text(f)).toContain('Invité');
    expect(text(f)).toContain('Actif');
  });

  it('offers a new link to an invited account, and nothing else', async () => {
    const f = await render();

    // An invited account has no session to deactivate yet: the only thing to
    // do with it is hand its owner a working link.
    expect(text(f)).toContain('Nouveau lien');
  });

  it('never offers to deactivate the account you are signed in with', async () => {
    const f = await render();
    const buttons = (f.nativeElement as HTMLElement).querySelectorAll('tbody button');

    // Two rows, and only the invited one carries an action.
    expect(buttons.length).toBe(1);
  });

  it('shows the link once creation returns it, and never a password', async () => {
    const f = await render();

    const internals = f.componentInstance as unknown as Internals;
    internals.form.setValue({
      email: 'nadia@esm.test',
      name: 'Nadia Roux',
      role: 'ADMISSIONS_OFFICER',
    });
    void internals.submit();

    http
      .expectOne((r) => r.method === 'POST' && r.url === '/api/users')
      .flush({
        ...ACCOUNTS[1],
        id: 'u3',
        invitationToken: 'a'.repeat(43),
        invitationExpiresAt: '2026-11-13T08:00:00.000Z',
      });
    // The screen reloads the list once creation answers, so the request only
    // exists after the promise chain has had its turn.
    await f.whenStable();
    http.expectOne((r) => r.method === 'GET' && r.url === '/api/users').flush(ACCOUNTS);
    await f.whenStable();
    f.detectChanges();

    expect(text(f)).toContain(`/invitation/${'a'.repeat(43)}`);
    expect(text(f)).not.toContain('password');
  });

  it('resolves every label through a key rather than hardcoding it', async () => {
    const f = await render();
    TestBed.inject(TranslocoService).setActiveLang('en');
    f.detectChanges();

    expect(text(f)).toContain('Invited');
    expect(text(f)).not.toContain('Invité');
  });
});
