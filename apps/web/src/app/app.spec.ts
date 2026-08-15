import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('monte le composant racine', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('affiche le nom du produit', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const rendu = fixture.nativeElement as HTMLElement;
    expect(rendu.querySelector('h1')?.textContent).toContain('Probo');
  });

  it('affiche les types de documents issus du package partagé', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const rendu = fixture.nativeElement as HTMLElement;
    expect(rendu.textContent).toContain('LETTRE_MOTIVATION');
  });
});
