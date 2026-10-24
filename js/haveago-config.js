/* ---- Edit this file to reword, retime, or reorder the "Have a Go" challenge ---- */
const HAVEAGO = {
  brandName: "Glasgow Clyde College",
  brandUnit: "Computing & Cybersecurity",
  brandColor: "#f2b705",

  // Hard ceiling for one go, in seconds.
  timeLimit: 320,

  mitreTags: [
    ["recon","Reconnaissance"],["disc","Discovery"],["initial","Initial Access"],
    ["cred","Credential Access"],["lateral","Lateral Movement"],["collect","Collection"],
    ["exfil","Exfiltration"],["forensics","Forensics"]
  ],

  /* ---------------------------------------------------------------------
     Each step has a "type":
       narr       — terminal narration only, auto-advances when typing finishes
       info       — an explainer/debrief panel with a Continue button
       quiz       — multiple choice; one correct option, others carry a note
       checklist  — multi-select; must match the "correct" set exactly
       consent    — multi-select "rules of engagement" sign-off; must match exactly
       custom     — one of the bespoke interactive scenes:
                    enum / sqli / lateral / exfil (red)
                    alertsoc / soccmd / trace / contain (blue — soccmd types
                    a short command sequence into the persistent SOC panel's
                    mini command line, same shape as a "narr" step)
     Any step can carry a "note" string — if present, it's logged to the
     Notes panel the moment that step is completed correctly.
  --------------------------------------------------------------------- */

  redSteps: [
    {type:"consent", title:"Rules of engagement", mitre:[], cta:"Sign agreement",
     note:"Scope agreed: public web app + 10.10.10.0/24 only, no social engineering, no payment systems.",
     feedbackWrong:"Check the list again — a couple of those are things a real pentester would never agree to, and you may be missing something you ARE allowed to do.",
     feedbackCorrect:"Rules of engagement signed. You're clear to begin.",
     items:[
       {text:"Test the public web application for vulnerabilities", correct:true},
       {text:"Scan the agreed 10.10.10.0/24 server range during the test window", correct:true},
       {text:"Report everything you find, responsibly and in writing", correct:true},
       {text:"Phone staff pretending to be IT support to get their password", correct:false},
       {text:"Take the live payment system offline to prove a point", correct:false},
       {text:"Keep a copy of anything interesting you find for yourself", correct:false}
     ]},

    {type:"narr", title:"Reconnaissance", mitre:["recon"],
     sub:"Gathering open-source intelligence before touching anything…",
     lines:[{t:"$ whois northbridge-holdings.example",cls:"cmd"},"Registrant: Northbridge Holdings plc",
            {t:"$ theHarvester -d northbridge-holdings.example -b all",cls:"cmd"},"[+] Subdomains: vpn. mail. portal. intranet."]},

    {type:"quiz", title:"Pick your OSINT angle", mitre:["recon"],
     prompt:"You've got an hour before the engagement window opens. Where do you look first?",
     options:[
       {text:"Company job adverts — they often reveal the tech stack", correct:true,
        note:"Good instinct — a job ad for an “ASP.NET / MS SQL developer” is exactly how real attackers fingerprint a stack before scanning a single port."},
       {text:"Phone reception and ask for the server room", correct:false,
        note:"That's social engineering, and it's out of scope for this engagement — stick to open-source intelligence."},
       {text:"Search paste sites for leaked credentials", correct:false,
        note:"Worth doing eventually, but at the very start of an engagement, open public sources like job ads and DNS come first."}
     ]},

    {type:"custom", custom:"linkedout", title:"A staff profile turns up", mitre:["recon"],
     note:"Recon: staff profile for Mrs Ystem Admina (IT Systems Administrator) lists Oracle SQL + PHP 8.x skills.",
     profile:{
       name:"Mrs Ystem Admina", initials:"YA",
       title:"IT Systems Administrator at Northbridge Holdings plc",
       skills:["Oracle® SQL","PHP 8.x Patch Management","Windows Server","Firewall Administration"],
       activity:[
         "Just completed: Oracle® SQL Fundamentals certification 🎉",
         "Completed: PHP 8.x Patch Management training",
         "Celebrating 6 years at Northbridge Holdings plc!"
       ]
     }},

    {type:"quiz", title:"Read between the lines", mitre:["recon"],
     prompt:"Her profile lists two very recent certifications: Oracle® SQL, and PHP 8.x Patch Management. What does that suggest about the web app's stack?",
     note:"Recon: profile suggests a PHP front end over an Oracle database.",
     options:[
       {text:"PHP running against an Oracle database", correct:true,
        note:"Right — her two newest certifications point straight at the stack: PHP on the app side, Oracle underneath."},
       {text:"Node.js and MongoDB", correct:false, note:"Nothing on her profile points to a JavaScript / NoSQL stack."},
       {text:"ASP.NET and MS SQL Server", correct:false,
        note:"Plausible in general, but nothing on this profile suggests .NET or SQL Server specifically — her certifications say otherwise."}
     ]},

    {type:"narr", title:"Discovery — probing the web server", mitre:["disc"],
     sub:"A few requests to see what's actually running, then a directory brute-force…",
     lines:[
       {t:"$ curl -I http://intranet.northbridge-holdings.example/",cls:"cmd"},
       "HTTP/1.1 200 OK   Server: Apache/2.4   X-Powered-By: PHP/8.1",
       {t:"$ gobuster dir -u http://intranet.northbridge-holdings.example/ -w common.txt",cls:"cmd"},
       {t:"/admin/               (Status: 200)",d:500,cb(){Notes.add("Discovery: /admin/ directory is open")}},
       {t:"/backup/              (Status: 200)",d:500,cb(){Notes.add("Discovery: /backup/ directory exposed")}},
       {t:"/uploads/             (Status: 200)",d:400},
       {t:"/config.php.bak       (Status: 200)",d:500,cb(){Notes.add("Discovery: config.php.bak left on the server — possible leaked config/credentials")}},
       {t:"Gobuster done — 4 interesting paths found.",cls:"ok"}
     ]},

    {type:"custom", custom:"enum", title:"Enumeration", mitre:["disc"],
     note:"Discovery: WEB01 confirmed as the public-facing web host.",
     clue:"A live scan confirms what's actually running — not just what's advertised. Which host is serving the public web app?"},

    {type:"quiz", title:"Which port matters?", mitre:["disc"],
     prompt:"WEB01 came back with three open ports: 22 (SSH), 80 (HTTP) and 3389 (RDP). Which one serves the public admin login you're about to target?",
     options:[
       {text:"Port 80 — HTTP", correct:true, note:"Right — the web app, and its admin login, is served over HTTP on port 80."},
       {text:"Port 22 — SSH", correct:false, note:"SSH is for remote server administration, not the public web app — and you don't have credentials for it anyway."},
       {text:"Port 3389 — RDP", correct:false, note:"RDP is remote desktop access, not a web login — that's a separate route entirely."}
     ]},

    {type:"quiz", title:"Spot the flaw", mitre:["initial"],
     prompt:"The login page builds this query directly from what you type into the form:<br><code>SELECT * FROM users WHERE user='USERNAME' AND pass='PASSWORD'</code><br>What's the vulnerability?",
     options:[
       {text:"No input sanitisation — your input becomes part of the query itself", correct:true,
        note:"Exactly — this is SQL injection (CWE-89). Because the input isn't escaped or parameterised, you can inject your own SQL logic into the query."},
       {text:"The password isn't masked on screen", correct:false, note:"Masking is a UI nicety, not the issue — the problem is how the query itself gets built."},
       {text:"The page uses HTTP instead of HTTPS", correct:false, note:"A real concern in general, but it's not what lets you bypass this login — that comes down to the query construction."}
     ]},

    {type:"custom", custom:"sqli", title:"Exploit it", mitre:["initial","cred"]},

    {type:"info", title:"What just happened", mitre:["cred"], cta:"Continue deeper",
     body:["Your password turned the query into:",
           "<code>SELECT * FROM users WHERE user='admin' AND pass='' OR '1'='1' -- '</code>",
           "'1'='1' is always true, so the OR makes the whole condition true no matter what the real password is — the query returns the admin row regardless.",
           "The fix: parameterised queries (prepared statements), so user input is always treated as data and never as part of the SQL itself."]},

    {type:"custom", custom:"lateral", title:"Move laterally", mitre:["lateral"],
     note:"Lateral movement: WEB01 credentials (YAdmina) reused against FILE01 over SMB.",
     fromLabel:"WEB01", toLabel:"FILE01", credLabel:"YAdmina / P@$$w0rd",
     clue:"FILE01 isn't reachable from the internet directly — but it trusts WEB01. Drag the recovered credentials across to reuse them on FILE01."},

    {type:"checklist", title:"What's worth taking?", mitre:["collect"],
     prompt:"You've got directory listing on FILE01. Select everything actually worth the risk of exfiltrating:",
     confirmLabel:"Confirm selection",
     feedbackWrong:"Not quite — check again. A couple of those aren't worth the risk, and you might be missing one that is.",
     feedbackCorrect:"Good call — those are the files worth the risk.",
     note:"Collection: staged TopSecret_MergerPlans.pdf, ExecutiveStrategy.docx and CustomerDatabase_Full.bak for exfiltration.",
     items:[
       {text:"TopSecret_MergerPlans.pdf", correct:true},
       {text:"ExecutiveStrategy.docx", correct:true},
       {text:"CustomerDatabase_Full.bak", correct:true},
       {text:"lunch_menu_october.docx", correct:false},
       {text:"printer_drivers_setup.exe", correct:false},
       {text:"team_photo_2024.jpg", correct:false}
     ]},

    {type:"custom", custom:"exfil", title:"Get the data out", mitre:["exfil"],
     note:"Exfiltration complete — data out before full containment."}
  ],

  blueSteps: [
    {type:"info", title:"Mission briefing", mitre:[], cta:"Start my shift",
     body:["You're SOC Tier 1 at Northbridge Holdings plc. Your job: triage alerts fast, and only escalate what's real.",
           "Most of what hits your queue is routine noise — backups, patch reminders, normal logins. Real incidents hide in that noise.",
           "Keep an eye on the live feed to the right — it runs for your whole shift."]},

    {type:"custom", custom:"alertsoc", title:"Which alert is real?", mitre:["exfil"],
     note:"Confirmed: outbound transfer to 203.0.113.50 is the real incident."},

    {type:"custom", custom:"soccmd", title:"Correlate the logs", mitre:["disc"],
     sub:"A quick search across firewall and auth logs before pulling the packet capture…",
     lines:[
       {t:"$ search index=firewall dest_ip=203.0.113.50 earliest=-2h",cls:"cmd"},
       "3 events matched. Source host: 10.10.10.40",
       {t:"$ search index=auth host=10.10.10.40 earliest=-4h",cls:"cmd"},
       "svc_sql login at 09:31, origin host 10.10.10.30",
       {t:"Correlation complete — pulling the packet capture to confirm.",cls:"ok"}
     ],
     note:"Correlated firewall and auth logs: the transfer traces to 10.10.10.40, reached via a service-account login from 10.10.10.30."},

    {type:"custom", custom:"trace", title:"Follow the trail", mitre:["cred"],
     wrongMsg:"That one's routine — keep clicking through the capture.",
     packets:[
       {t:"09:01:02", src:"10.10.10.30 (FILE01)", dst:"10.10.10.1 (Firewall)", proto:"ARP",  len:"42",   info:"Who has 10.10.10.1? FILE01 is asking", correct:false},
       {t:"09:01:05", src:"10.10.10.40 (DB01)",    dst:"8.8.8.8",               proto:"DNS",  len:"74",   info:"Standard query A time.windows.com", correct:false},
       {t:"09:02:11", src:"203.0.113.50",          dst:"10.10.10.1 (Firewall)", proto:"TLS",  len:"583",  info:"Client Hello — VPN endpoint",
        note:"Trace: VPN connection opened from 203.0.113.50 at 09:02."},
       {t:"09:14:40", src:"10.10.10.20 (WEB01)",   dst:"10.10.10.1 (Firewall)", proto:"HTTP", len:"211",  info:"POST /admin/login.php — 200 OK",
        note:"Trace: successful admin login on WEB01 (10.10.10.20) at 09:14."},
       {t:"09:31:02", src:"10.10.10.30 (FILE01)",  dst:"10.10.10.20 (WEB01)",   proto:"SMB",  len:"348",  info:"Session setup — svc_web",
        note:"Trace: FILE01 (10.10.10.30) accessed over SMB using svc_web's credentials at 09:31."},
       {t:"09:47:15", src:"10.10.10.40 (DB01)",    dst:"203.0.113.50",         proto:"TLS",  len:"1514", info:"Application Data (large)", correct:true, big:true,
        note:"Trace: large outbound transfer — DB01 (10.10.10.40) to 203.0.113.50, starting 09:47, ~4.2 GB."},
       {t:"09:47:16", src:"10.10.10.40 (DB01)",    dst:"203.0.113.50",         proto:"TLS",  len:"1514", info:"Application Data (large)", correct:false, big:true},
       {t:"09:48:02", src:"10.10.10.55",           dst:"10.10.10.1 (Firewall)", proto:"DHCP", len:"328",  info:"DHCP Request — routine renewal", correct:false}
     ]},

    {type:"checklist", title:"What's been touched?", mitre:["disc"],
     prompt:"From what the trace just showed you, confirm which hosts are affected so you don't miss one:",
     confirmLabel:"Confirm scope",
     feedbackWrong:"Check your notes — the trace named every host the attacker actually touched.",
     feedbackCorrect:"That's the full blast radius — WEB01, FILE01 and DB01.",
     note:"Blast radius confirmed: WEB01, FILE01 and DB01.",
     items:[
       {text:"WEB01 — the admin login the trace flagged at 09:14", correct:true},
       {text:"FILE01 — accessed over SMB with reused credentials", correct:true},
       {text:"DB01 — where the large transfer out actually started", correct:true},
       {text:"The internet — not a host on your network", correct:false}
     ]},

    {type:"quiz", title:"Before you touch anything", mitre:[],
     prompt:"You've confirmed a live breach touching production servers. What's the right move before you start blocking and isolating things yourself?",
     note:"Escalated to the Incident Lead before taking containment action.",
     options:[
       {text:"Quickly loop in the Incident Lead so the response is coordinated", correct:true,
        note:"Right — a major incident isn't a one-person job. The Incident Lead coordinates who does what and keeps management informed."},
       {text:"Just contain it yourself and explain afterwards", correct:false,
        note:"Speed matters, but containment on production systems without sign-off can cause its own outage — and leaves no one else aware it's happening."},
       {text:"Note it for the end-of-shift handover", correct:false,
        note:"An active exfiltration can't wait for a shift handover — this needs action now."}
     ]},

    {type:"custom", custom:"contain", title:"Shut it down", mitre:["exfil"],
     note:"Outbound traffic to 203.0.113.50 blocked and the attacker's session killed."},

    {type:"quiz", title:"Before you move on", mitre:["forensics"],
     prompt:"You've blocked the transfer. What should happen next, before anyone starts cleaning up?",
     note:"Forensics: disk images and logs preserved before remediation began.",
     options:[
       {text:"Image the affected disks and preserve the logs", correct:true,
        note:"Right — evidence gets preserved before anything else is touched, in case this goes to a formal investigation."},
       {text:"Delete the attacker's files to tidy up", correct:false,
        note:"Never delete evidence first — that destroys exactly what you'd need for root-cause analysis, or any legal follow-up."},
       {text:"Reboot every affected server", correct:false,
        note:"Rebooting can wipe volatile evidence — memory, active connections — that's often critical to understanding what happened."}
     ]},

    {type:"checklist", title:"Close it out", mitre:[],
     prompt:"The incident's contained and evidence preserved. Pick the fixes worth putting in the report:",
     confirmLabel:"Confirm recommendations",
     feedbackWrong:"A couple of those wouldn't actually have stopped this chain — check again.",
     feedbackCorrect:"Solid list — all of those would have slowed or stopped this attack.",
     note:"Report recommendations: phishing-resistant MFA on the VPN, segment FILE01 from DB01, alert on service-account interactive logins.",
     items:[
       {text:"Phishing-resistant MFA on the VPN", correct:true},
       {text:"Segment FILE01 from DB01", correct:true},
       {text:"Alert on service-account interactive logins", correct:true},
       {text:"Remove the firewall to simplify the network", correct:false},
       {text:"Give all staff local admin rights", correct:false},
       {text:"Turn off logging to save disk space", correct:false}
     ]}
  ],

  // Enumeration (Red team, custom step)
  enumTarget: "web",
  enumWrongMsg: "No response from that host — try again.",

  // SQL injection (Red team, custom step) — tap-to-insert chips removed; hint only.
  sqliPatterns: [/'\s*or\s*'?1'?\s*=\s*'?1/i, /'\s*or\s*1\s*=\s*1/i, /admin'\s*--/i, /'\s*--/],
  sqliHint: "Try:  ' OR '1'='1' --",
  credReveal: {user:"YAdmina", pass:"P@$$w0rd", note:"Credential access: recovered YAdmina / P@$$w0rd from the compromised login."},

  // Exfiltration race (Red team, custom step)
  pushIncrement: {min:5, max:12},
  suspPerSecond: 2.0,
  suspPerWrongEnum: 6,
  // Cosmetic "blue is catching up" bar — seesaws, but is capped below 100 so it
  // never itself ends the game; only the suspicion meter can do that.
  exfilBlueChase: {capMin:90, capMax:95, stepMin:-6, stepMax:9, tickMs:400},

  // Persistent SOC feed (Blue team) — cycles for the player's whole shift,
  // not just before the real alert. The list repeats once it runs out.
  socDecoys: [
    "Scheduled backup completed: FILE01",
    "Login success: a.khan (known device)",
    "AV definitions updated: all hosts",
    "Patch reminder: WEB01 updates pending",
    "Printer queue cleared: FLOOR2-PRINT",
    "Heartbeat OK: all monitored hosts",
    "Vulnerability scan completed: no new findings",
    "Certificate renewal reminder: portal.northbridge-holdings.example"
  ],
  socDecoyIntervalMs: 2200,
  // How long after the alert screen opens the real alert fires, in ms —
  // independent of the ambient feed's own tick rate above.
  socAlertDelayMs: 2600,

  // SIEM alert list shown once the real alert fires (Blue team, custom step)
  blueAlerts: [
    {text: "Outbound transfer: 4.2 GB to 203.0.113.50 (rare destination)", real: true},
    {text: "Failed login: jsmith from 10.10.10.55 (x1)", real: false},
    {text: "Patch reminder: WEB01 updates pending", real: false},
    {text: "VPN login: a.khan from known device", real: false},
    {text: "Scheduled backup completed: FILE01", real: false},
    {text: "Antivirus definitions updated: all hosts", real: false}
  ],
  blueWrongMsg: "That's routine activity — keep looking.",

  // Containment choice (Blue team, custom step)
  containChoices: [
    {text: "Block outbound traffic to 203.0.113.50", correct: true},
    {text: "Reboot DB01", correct: false, note:"Rebooting doesn't touch the live transfer — the data is still leaving while it reboots."},
    {text: "Disable Wi-Fi on the SOC analyst's laptop", correct: false, note:"That only cuts you off from watching — the attacker's connection is untouched."}
  ],
  containWrongMsg: "That doesn't stop the live transfer.",
  blueExfilPerSecond: 1.2
};
