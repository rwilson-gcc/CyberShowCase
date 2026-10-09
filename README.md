# Cyber Security Lifecycle Demonstration

An interactive, self-contained HTML/CSS/JS demo that walks through a full
penetration test lifecycle — from board authorisation through to SOC
detection, containment and lessons learned. Built for classroom and
open-day use at Glasgow Clyde College.

No external dependencies, no build step, no backend. Open `index.html`
in a browser or drop the folder onto any static web host.

## File structure

```
cyber-showcase/
├── index.html          Page structure and all scene markup
├── css/
│   └── styles.css       All styling, colour themes, animations
└── js/
    ├── config.js         Branding, timing, and every stage's content — edit this first
    ├── terminal.js        Typewriter effect for the terminal panel
    ├── network.js          SVG network diagram: nodes, links, packet animation
    ├── panels.js            Approval screen, MITRE matrix, SIEM dashboard,
    │                         analyst panels, exfiltration bar, SQL injection scene
    ├── timeline.js           Stage progress dots at the bottom of the page
    └── app.js                Wires everything together: stage sequencing,
                                scoring, Automated/Live mode, Back/Next/jump
```

Scripts must load in the order listed in `index.html` (config, terminal,
network, panels, timeline, app) — later files depend on functions defined
in earlier ones.

## Running it

**Quickest:** double-click `index.html`. Everything is self-contained, so
it works straight off disk.

**GitHub Pages:** copy the contents of `cyber-showcase/` into the repo
root (or wherever Pages is configured to serve from), so `index.html`
sits at the site's root URL.

**Self-hosted / Proxmox:** copy the whole folder onto any static web
server (nginx, Apache, Caddy). No server-side processing is required.

## Using the demo

- **Automated mode** advances through all twelve stages on its own, with
  a configurable dwell time per stage. When it reaches the last stage it
  waits out the dwell time, then loops back to the start automatically —
  it will run indefinitely until you stop it.
- **Live mode** hands control to the presenter:
  - **Next** / **Back** step forward or backward one stage.
  - Clicking a numbered dot in the stage tracker at the bottom jumps
    straight to that stage.
  - Right arrow / space = Next, left arrow = Back.
- **F** or the Fullscreen button toggles presentation mode, which hides
  the page title and enlarges the terminal and stage heading.

Switching between Automated and Live, or changing it mid-run, resets the
demo back to "Ready" — press Start Demo again to begin.

Every time a stage is shown — whether by Next, Back, a direct jump, or
the normal automated sequence — it's rendered fresh from a blank slate
(terminal retyped, network diagram, exfiltration bar, SIEM panel and
login form all reset first). Scores are recalculated from scratch based
on which stage you're viewing, so jumping around the timeline never
double-counts or drops points. Jumping or going back does **not** replay
every earlier stage's effect on the network diagram — a stage only shows
what its own script reveals, not the accumulated history of stages you
skipped.

## Stages

1. Authorisation — CEO, CISO and Board sign off before testing begins
2. Reconnaissance — OSINT gathering (WHOIS, subdomains, staff emails)
3. Enumeration — live fake `nmap` scan against the internal network
4. Network Mapping — trust relationships and a candidate attack path
5. Initial Access — VPN access and privilege escalation
6. Web Exploitation — a simple SQL injection bypasses the WEB01 admin login
7. Data Access — top-secret files located, exfiltration begins
8. Alert Triggered — the SIEM fires on the outbound transfer
9. SOC Analysis — analysts correlate logs and confirm the incident
10. Containment — firewall rules block the attacker, hosts isolated
11. Forensics — timeline reconstruction and evidence preservation
12. Lessons Learned — what worked, what to improve, report to the Board

## Customising

Almost everything you'd want to change lives in `js/config.js`:

- `BRAND` — college name, department name, accent colour
- `AUTO_SECONDS` — dwell time per stage in Automated mode
- `STAGES` — the full script: each stage's title, team colour, MITRE
  tactic tags, scoring, network path, terminal lines, and any special
  behaviour (`act()`)

The organisation name ("Northbridge Holdings plc"), IP ranges
(`10.10.10.0/24`, documentation-range `203.0.113.x` for the attacker),
and all "stolen" filenames are fictional and don't correspond to any
real network.

## Browser support

Modern evergreen browsers (Chrome, Edge, Firefox, Safari). Uses native
SVG, CSS custom properties and the Fullscreen API — no polyfills
included. `prefers-reduced-motion` is respected throughout.
