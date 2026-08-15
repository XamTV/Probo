import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('mounts the root component', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the product name', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const rendered = fixture.nativeElement as HTMLElement;
    expect(rendered.querySelector('h1')?.textContent).toContain('Probo');
  });

  it('renders French labels for the shared document types', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const rendered = fixture.nativeElement as HTMLElement;
    expect(rendered.textContent).toContain('Lettre de motivation');
    expect(rendered.textContent).toContain('COVER_LETTER');
  });
});
