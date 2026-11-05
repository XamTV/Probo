import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { DEFAULT_LOCALE, LOCALES } from '@probo/shared';

import { SharedTranslocoLoader } from '../i18n/transloco-loader';
import { CampaignSettings } from './campaign-settings';
import type { CampaignDetail } from './campaigns.service';

const CAMPAIGN: CampaignDetail = {
  id: 'c1',
  name: 'Mastère 2027',
  description: null,
  status: 'DRAFT',
  expectedTypes: ['RESUME'],
  confidenceThreshold: 70,
  relevanceWeight: 0.5,
  clarityWeight: 0.25,
  formalQualityWeight: 0.25,
  opensAt: null,
  closesAt: null,
  referenceProfiles: [],
  activationBlockers: ['MISSING_REFERENCE_PROFILE'],
};

/** Reaches the computed signal without widening its visibility for production. */
interface Internals {
  effective: () => { relevance: number; clarity: number; formalQuality: number } | null;
  ready: () => boolean;
}

describe('CampaignSettings', () => {
  let fixture: ComponentFixture<CampaignSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampaignSettings],
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
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'c1']]) } } },
      ],
    }).compileComponents();
  });

  async function render(
    campaign: CampaignDetail = CAMPAIGN,
  ): Promise<ComponentFixture<CampaignSettings>> {
    fixture = TestBed.createComponent(CampaignSettings);
    TestBed.inject(HttpTestingController).expectOne('/api/campaigns/c1').flush(campaign);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  it('renders what blocks activation, as the server states it', async () => {
    const f = await render();

    // The screen recomputes nothing: it shows the list the API decided with
    // the shared rule, so the two can never tell different stories.
    expect((f.nativeElement as HTMLElement).textContent).toContain(
      "Un type attendu n'a pas de référentiel",
    );
    expect(internals().ready()).toBe(false);
  });

  it('normalises the weights by their sum (RG-05)', async () => {
    // Three equal weights that do not add up to 1: each is worth a third.
    await render({ ...CAMPAIGN, relevanceWeight: 1, clarityWeight: 1, formalQualityWeight: 1 });

    expect(internals().effective()).toEqual({ relevance: 33, clarity: 33, formalQuality: 33 });
  });

  it('renders no percentage at all when the weighting is zero', async () => {
    await render({ ...CAMPAIGN, relevanceWeight: 0, clarityWeight: 0, formalQualityWeight: 0 });

    // Dividing by zero would show NaN. It is a configuration error, not a
    // value to invent — and the contract already refuses it on save.
    expect(internals().effective()).toBeNull();
  });

  it('allows activation once nothing blocks it any more', async () => {
    await render({ ...CAMPAIGN, activationBlockers: [] });

    expect(internals().ready()).toBe(true);
  });
});
