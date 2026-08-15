import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TypeDocument } from '@probo/shared';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly titre = signal('Probo');
  protected readonly baseline = signal('La preuve, document par document.');

  /** Vient du package partagé : une seule définition pour le front et l'API. */
  protected readonly typesDocument = TypeDocument.options;
}
