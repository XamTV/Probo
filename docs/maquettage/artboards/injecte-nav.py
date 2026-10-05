#!/usr/bin/env python3
"""Injecte la coquille de navigation dans tout artboard portant <!--NAV:Item|Persona-->.

Une seule source de vérité pour la navigation : si elle change, elle change partout.
"""
import io
import re
import sys
import glob

ITEMS = [
    ("Candidatures", None),
    (None, ("Classement", '<path d="M4 6h16"/><path d="M4 12h11"/><path d="M4 18h7"/>')),
    (None, ("Importer un lot", '<path d="M12 19V7"/><path d="M7 12l5-5 5 5"/><path d="M4 20h16"/>')),
    ("Administration", None),
    (None, ("Campagnes", '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>')),
    (None, ("Comptes", '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M17 8.5h4"/><path d="M19 6.5v4"/>')),
    (None, ("Journal d'audit", '<path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z"/><path d="M9.5 12l1.8 1.8 3.4-3.6"/>')),
]

PERSONAS = {
    "claire": ("CF", "Claire Fontaine", "Chargée d'admission"),
    "marc": ("MD", "Marc Delaunay", "Administrateur"),
}

CSS = """    .navitem { display: flex; align-items: center; gap: 10px; height: 34px; padding: 0 10px; border-radius: 4px; font-size: 13.5px; color: #D4D8DE; cursor: pointer; }
    .navitem:hover { background: #262C34; }
    .navitem.on { background: #313A45; color: #FFFFFF; font-weight: 500; }
    .navsec { padding: 18px 10px 7px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: #7C858F; }
"""


def nav(active, persona):
    initials, name, role = PERSONAS[persona]
    out = ['  <!-- Coquille de navigation, identique sur tous les écrans -->',
           '  <nav style="width: 232px; flex-shrink: 0; background: #1B2027; display: flex; flex-direction: column; padding: 0 12px 14px;">',
           '    <div style="display: flex; align-items: center; height: 56px; padding: 0 10px;">',
           '      <span style="font-family: \'IBM Plex Mono\', monospace; font-size: 14px; font-weight: 500; letter-spacing: 0.14em; color: #FFFFFF;">PROBO</span>',
           '    </div>',
           '    <div style="padding: 10px 11px 11px; background: #262C34; border: 1px solid #333B45; border-radius: 5px;">',
           '      <div style="font-size: 10.5px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; color: #7C858F; margin-bottom: 7px;">Campagne</div>',
           '      <div style="display: flex; align-items: flex-start; gap: 7px; cursor: pointer;">',
           '        <span style="font-size: 13px; font-weight: 500; color: #FFFFFF; line-height: 1.35;">Mastère Marketing Digital — Rentrée 2026</span>',
           '        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9AA1A9" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-top: 4px; flex-shrink: 0;"><path d="M6 9l6 6 6-6"/></svg>',
           '      </div>',
           '      <div style="display: flex; align-items: center; gap: 7px; margin-top: 9px; padding-top: 9px; border-top: 1px solid #333B45;">',
           '        <span style="display: inline-flex; align-items: center; padding: 2px 7px; background: #21402F; border-radius: 3px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #7BC49B;">Active</span>',
           '        <div style="flex-grow: 1;"></div>',
           '        <a href="#" style="display: inline-flex; align-items: center; gap: 5px; font-size: 12px; color: #A9BCDE;">',
           '          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A9BCDE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M4 12h2"/><path d="M18 12h2"/><path d="M12 4v2"/><path d="M12 18v2"/></svg>',
           '          Réglages',
           '        </a>',
           '      </div>',
           '    </div>']
    for section, item in ITEMS:
        if section:
            out.append('    <div class="navsec">%s</div>' % section)
            continue
        label, path = item
        cls = 'navitem on' if label == active else 'navitem'
        out.append(
            '    <div class="%s"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">%s</svg>%s</div>' % (cls, path, label)
        )
    out += ['    <div style="flex-grow: 1;"></div>',
            '    <div style="padding: 12px 10px 10px; border-top: 1px solid #2C333C; display: flex; flex-direction: column; gap: 11px;">',
            '      <div style="display: flex; align-items: center; gap: 9px;">',
            '        <span style="display: inline-flex; align-items: center; justify-content: center; width: 27px; height: 27px; border-radius: 50%%; background: #333B45; font-size: 11px; font-weight: 600; color: #D4D8DE;">%s</span>' % initials,
            '        <div style="display: flex; flex-direction: column;">',
            '          <span style="font-size: 12.5px; color: #FFFFFF;">%s</span>' % name,
            '          <span style="font-size: 11px; color: #7C858F;">%s</span>' % role,
            '        </div>',
            '      </div>',
            '      <div style="display: flex; align-items: center; gap: 8px;">',
            '        <div style="display: flex; border: 1px solid #3B434D; border-radius: 4px; overflow: hidden;">',
            '          <span style="padding: 3px 8px; font-size: 11.5px; font-weight: 500; background: #313A45; color: #FFFFFF;">FR</span>',
            '          <span style="padding: 3px 8px; font-size: 11.5px; color: #9AA1A9;">EN</span>',
            '        </div>',
            '        <div style="flex-grow: 1;"></div>',
            '        <a href="#" style="font-size: 12px; color: #9AA1A9;">Déconnexion</a>',
            '      </div>',
            '    </div>',
            '  </nav>']
    return "\n".join(out)


count = 0
for fn in sorted(glob.glob("*.dc.html")):
    s = io.open(fn, encoding="utf-8").read()
    m = re.search(r'^\s*<!--NAV:([^|]+)\|(\w+)-->\s*$', s, re.M)
    if not m:
        continue
    active, persona = m.group(1).strip(), m.group(2).strip().lower()
    if persona not in PERSONAS:
        sys.exit("persona inconnu dans %s : %s" % (fn, persona))
    s = s[:m.start()] + nav(active, persona) + s[m.end():]
    if ".navitem" not in s:
        s = s.replace("  </style>\n</helmet>", CSS + "  </style>\n</helmet>", 1)
    io.open(fn, "w", encoding="utf-8").write(s)
    print("nav injectée — %-32s actif=%s persona=%s" % (fn, active, persona))
    count += 1

print("%d artboard(s) traité(s)" % count)
