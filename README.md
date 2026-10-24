# Cyber Security Lifecycle Demonstration

Three self-contained, no-build, no-backend HTML/CSS/JS pages for Glasgow
Clyde College's Computing & Cybersecurity department:

- **`index.html`** — a landing page: pick Showcase or Have a Go.
- **`showcase.html`** — a narrated walkthrough of a full penetration
  test, from board authorisation to lessons learned. For a screen
  running unattended or a presenter-led walkthrough.
- **`haveago.html`** — a short, hands-on "have a go" challenge for a
  competition stand or open day. The visitor plays Red Team (break in
  and steal the data) or Blue Team (spot the breach and contain it)
  against the clock, with a local leaderboard.

All three run entirely in the browser with no dependencies. Open
`index.html` to choose, or link straight to either page directly.

## File structure

```
cyber-showcase/
├── index.html            Landing page — choose Showcase or Have a Go
├── showcase.html         The narrated showcase
├── haveago.html          The "have a go" stand challenge
├── css/
│   ├── styles.css          Shared base styles — used by all three pages
│   └── haveago.css         Styles specific to haveago.html
└── js/
    ├── config.js            showcase.html: branding, timing, all 12 stages
    ├── app.js               showcase.html: stage sequencing, modes, scoring
    ├── panels.js             showcase.html: SIEM, approval, analysts, SQLi scene
    ├── timeline.js            showcase.html: stage progress dots
    ├── terminal.js          Shared: terminal typing effect — used by showcase and haveago
    ├── network.js           Shared: SVG network diagram — used by showcase and haveago
    ├── haveago-config.js    haveago.html: wording, clues, timings, leaderboard
    └── haveago.js           haveago.html: role select, race logic, scoring
```

`index.html` is just markup and a few inline styles — it loads no
scripts. `showcase.html` and `haveago.html` each load their own scripts
in dependency order — see the `<script>` tags near the bottom of each
file. `terminal.js` and `network.js` are shared by both and must load
before `app.js` / `haveago.js`, which depend on them.

## Running it

**Quickest:** double-click `index.html` and pick a page from there, or
open `showcase.html` / `haveago.html` directly. All three work straight
off disk. One caveat: `haveago.html`'s leaderboard uses the browser's
local storage, which some browsers restrict when a page is opened as a
`file://` URL rather than served over HTTP. If scores aren't saving,
serve the folder instead — e.g. `python -m http.server` from inside
`cyber-showcase/`, then open `http://localhost:8000/`.

**GitHub Pages:** copy the contents of `cyber-showcase/` into the repo
root (or wherever Pages is configured to serve from). The landing page
will be served at the site's root URL.

**Self-hosted / Proxmox:** copy the whole folder onto any static web
server (nginx, Apache, Caddy). No server-side processing required, and
this sidesteps the local-storage caveat above.

## showcase.html — the showcase

- **Automated mode** advances through all twelve stages on its own, on a
  configurable dwell time. After the last stage it loops back to the
  start and keeps running until stopped.
- **Live mode** hands control to the presenter: **Next** / **Back** to
  step one stage at a time, or click a numbered dot in the stage tracker
  to jump straight to that stage. Right arrow / space = Next, left arrow
  = Back.
- **F** or the Fullscreen button toggles presentation mode.

Every stage render — via Next, Back, a direct jump, or the automated
sequence — starts that stage fresh (terminal retyped, network diagram,
exfiltration bar, SIEM panel and login form all reset first), and the
score is recalculated from scratch for wherever you land, so jumping
around never double-counts. A stage only shows what its own script
reveals, not the accumulated history of stages you skipped past.

**Stages:** Authorisation → Reconnaissance → Enumeration → Network
Mapping → Initial Access → Web Exploitation (SQL injection) → Data
Access → Alert Triggered → SOC Analysis → Containment → Forensics →
Lessons Learned.

**Customising:** almost everything lives in `js/config.js` — `BRAND`
(college name, accent colour), `AUTO_SECONDS` (dwell time), and `STAGES`
(each stage's title, team colour, MITRE tag, scoring, terminal lines and
any special behaviour).

## haveago.html — the stand challenge

Visitor picks a side, then plays through a full kill chain — a mix of
narration, short multiple-choice and multi-select questions (each with
an explanation, right or wrong), and hands-on interactive moments. A
MITRE ATT&CK tag strip across the top lights up live as each tactic is
reached.

The right-hand panel changes with the side you pick. Red Team keeps the
plain terminal. Blue Team replaces it entirely with a persistent SOC
feed and a mini command line — both run for the whole shift, not just
during one step, so the "SOC centre" feel carries through briefing,
quizzes and containment alike.

Red Team plays through recon (including a fake LinkedOUT profile),
discovery with a live dirbuster-style scan, credential access, a
drag-to-connect lateral movement puzzle, and a seesawing exfiltration
race against the SOC. Blue Team opens on that live feed ticking over
with routine noise, then the real alert drops into it; a log-correlation
step types search commands into the mini command line; an interactive
packet-trace click-through logs each host the attacker actually touched
(VPN login, the WEB01 admin login, the FILE01 SMB session, and finally
the DB01 exfil) to Notes as you click through it, so the next
checklist — confirming which hosts are affected — is answerable from
what you just found, not from having played Red first; then an
escalation decision, containment, a forensics quiz, and a closing
recommendations checklist. A running Notes panel (shared layout, under
whichever side panel is showing) fills itself in as key facts are
gathered on both sides, so the player can scroll back through what
they've found.

Both paths end on a result screen with elapsed time and the full list
of MITRE tactics touched. A win lets the visitor save their name to a
local leaderboard (separate fastest-time boards per team), viewable any
time via the header's Leaderboard button. A configurable hard time
limit (default just over five minutes) and a shrinking bar at the top
stop a stuck player from blocking the queue. Restarting (or timing out)
fully clears the run's state — elapsed time, notes, exfil/suspicion
meters — so the next player starts from zero.

**Customising:** `js/haveago-config.js` holds the whole sequence as two
arrays (`redSteps`, `blueSteps`). Reorder, add or remove steps by
editing those arrays; everything else — wording, the MITRE tag list,
decoy alerts, containment notes, and every timing value — is also in
that file.

## Fictional data

The organisation name ("Northbridge Holdings plc"), internal IP range
(`10.10.10.0/24`), the attacker's documentation-range IP
(`203.0.113.x`), all "stolen" filenames, and the fictional "LinkedOUT"
profile and staff names are made up and don't correspond to any real
network, service, or person.

## Browser support

Modern evergreen browsers (Chrome, Edge, Firefox, Safari). Uses native
SVG, CSS custom properties, `localStorage` (haveago.html) and the
Fullscreen API — no polyfills included. `prefers-reduced-motion` is
respected throughout.
