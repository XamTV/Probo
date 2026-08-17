import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { DocumentType, Locale } from '@probo/shared';

import { LocaleService } from './i18n/locale.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslocoDirective],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly localeService = inject(LocaleService);

  protected readonly locale = this.localeService.locale;
  protected readonly locales = this.localeService.available;

  /**
   * Enum values come from the shared package; their labels come from the
   * translation files. The template resolves `documentType.<VALUE>`, so adding
   * a document type never means touching a component.
   */
  protected readonly documentTypes = DocumentType.options;

  protected switchLocale(locale: Locale): void {
    this.localeService.set(locale);
  }
}
