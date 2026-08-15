import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DOCUMENT_TYPE_LABELS_FR, DocumentType } from '@probo/shared';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly productName = signal('Probo');
  protected readonly tagline = signal('La preuve, document par document.');

  /**
   * Comes from the shared package: one definition for the front end and the
   * API. Values are English, labels are French — the UI never shows a raw
   * enum value.
   */
  protected readonly documentTypes = DocumentType.options.map((value) => ({
    value,
    label: DOCUMENT_TYPE_LABELS_FR[value],
  }));
}
