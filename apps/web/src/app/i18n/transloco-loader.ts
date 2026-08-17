import { Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { Locale, TRANSLATIONS } from '@probo/shared';
import { Observable, of } from 'rxjs';

/**
 * Loads translations from @probo/shared instead of fetching JSON over HTTP.
 *
 * The same strings feed the PDF export, which is generated server side, so they
 * are authored once in the shared package. Both locales ship in the bundle;
 * with two locales that is a few kilobytes, and it removes an HTTP round trip
 * and an asset-copying build step.
 */
@Injectable({ providedIn: 'root' })
export class SharedTranslocoLoader implements TranslocoLoader {
  getTranslation(lang: string): Observable<Translation> {
    return of(TRANSLATIONS[lang as Locale] as Translation);
  }
}
