import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Application shell. Every screen is a route; this holds the outlet. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}
