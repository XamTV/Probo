import {
  escapesDestination,
  hasAllowedExtension,
  isRegularFile,
  isSecurityIncident,
  isSystemEntry,
  looksLikePdf,
  rejectOnHeader,
} from './archive-entry';

const UNIX = 3 << 8;
const DOS = 0;
const mode = (m: number) => (m << 16) >>> 0;

describe('RG-07 — condition 1, the resolved path stays inside the destination', () => {
  it.each(['dubois_marie/cv.pdf', 'cv.pdf', 'a/b/../cv.pdf', './cv.pdf', 'dossier..pdf/cv.pdf'])(
    'accepts %s',
    (name) => {
      expect(escapesDestination(name)).toBe(false);
    },
  );

  it.each([
    '../../etc/cron.d/task',
    '../cv.pdf',
    'a/../../cv.pdf',
    '/etc/passwd',
    '..\\..\\windows\\system32\\x.pdf',
    'a\\..\\..\\cv.pdf',
    'C:/Windows/x.pdf',
    'c:\\x.pdf',
    'cv.pdf\0.txt',
  ])('refuses %j', (name) => {
    expect(escapesDestination(name)).toBe(true);
  });

  it('resolves the path instead of searching it for two dots', () => {
    // A name made of dots that never climbs is legitimate; a search for `..`
    // would refuse it, and would be fooled by the separators it did not list.
    expect(escapesDestination('..cv.pdf')).toBe(false);
    expect(escapesDestination('a/./../../b.pdf')).toBe(true);
  });
});

describe('RG-07 — condition 2, a regular file only', () => {
  it('refuses a symbolic link made on a Unix host', () => {
    expect(isRegularFile(UNIX | 20, mode(0o120777))).toBe(false);
  });

  it('refuses a pipe, a device and a socket', () => {
    for (const special of [0o010644, 0o020644, 0o060644, 0o140644]) {
      expect(isRegularFile(UNIX | 20, mode(special))).toBe(false);
    }
  });

  it('accepts a regular file, and a mode of zero that several tools write', () => {
    expect(isRegularFile(UNIX | 20, mode(0o100644))).toBe(true);
    expect(isRegularFile(UNIX | 20, 0)).toBe(true);
  });

  it('accepts an entry from a host that cannot express a link', () => {
    expect(isRegularFile(DOS | 20, mode(0o120777))).toBe(true);
  });
});

describe('RG-07 — condition 3, the allow-list', () => {
  it('accepts the PDF extension in any case', () => {
    expect(hasAllowedExtension('cv.PDF')).toBe(true);
    expect(hasAllowedExtension('notes.docx')).toBe(false);
    expect(hasAllowedExtension('cv.pdf.exe')).toBe(false);
  });

  it('judges the content by its signature, not by its name', () => {
    expect(looksLikePdf(Buffer.from('%PDF-1.7\n'))).toBe(true);
    expect(looksLikePdf(Buffer.from('MZ\x90\x00 executable'))).toBe(false);
  });

  it('tolerates a short preamble before the signature, as readers do', () => {
    expect(looksLikePdf(Buffer.from(`${' '.repeat(100)}%PDF-1.4`))).toBe(true);
    expect(looksLikePdf(Buffer.from(`${' '.repeat(2000)}%PDF-1.4`))).toBe(false);
  });

  it('names what an operating system adds behind its user', () => {
    expect(isSystemEntry('__MACOSX/._cv.pdf')).toBe(true);
    expect(isSystemEntry('dubois/._cv.pdf')).toBe(true);
    expect(isSystemEntry('dubois/.DS_Store')).toBe(true);
    expect(isSystemEntry('dubois/Thumbs.db')).toBe(true);
    expect(isSystemEntry('dubois/cv.pdf')).toBe(false);
  });
});

describe('RG-07 — the reason reported for an entry refused on its header', () => {
  const header = {
    name: 'dubois/cv.pdf',
    versionMadeBy: UNIX | 20,
    externalFileAttributes: mode(0o100644),
    declaredSize: 1000,
    maxFileSizeBytes: 20 * 1024 * 1024,
  };

  it('lets a well-formed entry through', () => {
    expect(rejectOnHeader(header)).toBeNull();
  });

  it('refuses an entry declared larger than the per-file ceiling without reading it', () => {
    expect(rejectOnHeader({ ...header, declaredSize: 21 * 1024 * 1024 })).toBe('FILE_TOO_LARGE');
  });

  it('reports a path escape first, even on a link: the incident is the fact to record', () => {
    expect(
      rejectOnHeader({ ...header, name: '../x.pdf', externalFileAttributes: mode(0o120777) }),
    ).toBe('PATH_ESCAPE');
  });

  it('labels an AppleDouble file as a system entry rather than a forbidden type', () => {
    expect(rejectOnHeader({ ...header, name: '__MACOSX/._cv.pdf' })).toBe('SYSTEM_ENTRY');
  });

  it('counts only the escape and the link as security incidents', () => {
    expect(isSecurityIncident('PATH_ESCAPE')).toBe(true);
    expect(isSecurityIncident('NOT_REGULAR_FILE')).toBe(true);
    expect(isSecurityIncident('FORBIDDEN_TYPE')).toBe(false);
    expect(isSecurityIncident('FILE_TOO_LARGE')).toBe(false);
  });
});
