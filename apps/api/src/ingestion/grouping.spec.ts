import { groupByHints, namePrefix } from './grouping';

describe('US-07 — grouping hints given by the archive', () => {
  it('groups by the sub-folder of each candidate', () => {
    const { groups, orphans } = groupByHints([
      'dubois_marie/cv.pdf',
      'dubois_marie/lettre.pdf',
      'martin_paul/cv.pdf',
    ]);
    expect(groups).toEqual([
      {
        candidateName: 'dubois_marie',
        source: 'FOLDER',
        paths: ['dubois_marie/cv.pdf', 'dubois_marie/lettre.pdf'],
      },
      { candidateName: 'martin_paul', source: 'FOLDER', paths: ['martin_paul/cv.pdf'] },
    ]);
    expect(orphans).toEqual([]);
  });

  it('looks past the folder the whole archive was made from', () => {
    const { groups } = groupByHints([
      'candidatures_2026/dubois_marie/cv.pdf',
      'candidatures_2026/martin_paul/cv.pdf',
    ]);
    expect(groups.map((g) => g.candidateName)).toEqual(['dubois_marie', 'martin_paul']);
  });

  it('keeps everything below the candidate folder with that candidate', () => {
    const { groups } = groupByHints([
      'dubois_marie/annexes/portfolio.pdf',
      'dubois_marie/cv.pdf',
      'martin_paul/cv.pdf',
    ]);
    expect(groups[0].paths).toEqual(['dubois_marie/annexes/portfolio.pdf', 'dubois_marie/cv.pdf']);
  });

  it('groups loose files by the prefix they share', () => {
    const { groups, orphans } = groupByHints([
      'dubois_marie_cv.pdf',
      'dubois_marie_lettre_motivation.pdf',
      'DUBOIS-Marie-portfolio.pdf',
      'martin_paul_cv.pdf',
      'martin_paul_lettre.pdf',
    ]);
    expect(groups).toEqual([
      {
        candidateName: 'dubois_marie',
        source: 'FILENAME',
        paths: [
          'dubois_marie_cv.pdf',
          'DUBOIS-Marie-portfolio.pdf',
          'dubois_marie_lettre_motivation.pdf',
        ],
      },
      {
        candidateName: 'martin_paul',
        source: 'FILENAME',
        paths: ['martin_paul_cv.pdf', 'martin_paul_lettre.pdf'],
      },
    ]);
    expect(orphans).toEqual([]);
  });

  it('leaves a file with no hint to reconciliation, attached to nobody', () => {
    const { groups, orphans } = groupByHints(['cv.pdf', 'scan_001.pdf', 'a/cv.pdf', 'b/cv.pdf']);
    expect(groups.map((g) => g.candidateName)).toEqual(['a', 'b']);
    expect(orphans).toEqual(['cv.pdf', 'scan_001.pdf']);
  });

  it('never makes an application per file out of prefixes no other file shares', () => {
    const many = Array.from({ length: 50 }, (_, i) => `document_${i}.pdf`);
    // `document` is shared by all fifty: a wrong hint, which reconciliation
    // will overturn by reading the text. What must not happen is fifty
    // single-file applications.
    expect(groupByHints(many).groups).toHaveLength(1);

    const distinct = ['scan_a1.pdf', 'photo_b2.pdf', 'releve_c3.pdf'];
    expect(groupByHints(distinct)).toEqual({ groups: [], orphans: distinct });
  });

  it('reads the prefix as every word but the last', () => {
    expect(namePrefix('dubois_marie_cv.pdf')).toBe('dubois_marie');
    expect(namePrefix('Dubois Marie - CV.pdf')).toBe('Dubois Marie');
    expect(namePrefix('cv.pdf')).toBeNull();
    expect(namePrefix('cv')).toBeNull();
  });
});
