import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

/**
 * The shell holds the router outlet and nothing else. What used to be tested
 * here — the bilingual interface, enum labels resolved by key — moved to
 * `auth/login.spec.ts`, which exercises a screen that really renders them.
 */
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('mounts the shell with a router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });
});
