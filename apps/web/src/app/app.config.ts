import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { DEFAULT_LOCALE, LOCALES } from '@probo/shared';

import { routes } from './app.routes';
import { sessionInterceptor } from './auth/session.interceptor';
import { LocaleService } from './i18n/locale.service';
import { SharedTranslocoLoader } from './i18n/transloco-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // The session cookie is httpOnly: the browser attaches it on its own, and
    // no code here ever holds the token.
    provideHttpClient(withInterceptors([sessionInterceptor])),
    provideTransloco({
      config: {
        availableLangs: [...LOCALES],
        defaultLang: DEFAULT_LOCALE,
        fallbackLang: DEFAULT_LOCALE,
        // A missing key must be loud in development and silent in production.
        missingHandler: { logMissingKey: isDevMode() },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: SharedTranslocoLoader,
    }),
    provideAppInitializer(() => inject(LocaleService).initialise()),
  ],
};
