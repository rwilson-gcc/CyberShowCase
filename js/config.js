/* ---- Edit these to rebrand and retime the demo ---- */
const BRAND={name:"Your College Name",unit:"Computing & Cybersecurity",accent:"#f2b705"};
const AUTO_SECONDS=25;

const MITRE=[["recon","Reconnaissance"],["resdev","Resource Dev"],["initial","Initial Access"],["exec","Execution"],["persist","Persistence"],["privesc","Priv Escalation"],["evasion","Defence Evasion"],["cred","Credential Access"],["disc","Discovery"],["lateral","Lateral Movement"],["collect","Collection"],["exfil","Exfiltration"]];

const ATTACK_PATH=['attacker','internet','firewall','web','files','db'];

const STAGES=[
{title:"Authorisation",team:"green-team",scene:"approval",host:"engagement-letter.pdf",sub:"Written approval before a single packet is sent",mitre:[],score:[0,0],
 act(){Approval.run()},
 lines:["Engagement: Northbridge Holdings plc - external and internal test","Requested by: Head of Information Security","Rules of engagement drafted, legal review complete.",{t:"Awaiting sign-off from CEO, CISO and Board chair...",cls:"warn",d:2500},{t:"All approvals received. Test may begin.",cls:"ok"}]},

{title:"Reconnaissance",team:"red-team",scene:"network",host:"pentester@kali:~$",sub:"Gathering open-source intelligence on the target",mitre:["recon"],score:[1,0],traffic:"recon",
 act(){Net.reveal('firewall')},
 lines:[{t:"$ whois northbridge-holdings.example",cls:"cmd"},"Registrant: Northbridge Holdings plc",{t:"$ theHarvester -d northbridge-holdings.example -b all",cls:"cmd"},"[+] 14 staff emails found","[+] Subdomains: vpn. mail. portal. intranet.",{t:"$ dig +short vpn.northbridge-holdings.example",cls:"cmd"},"203.0.113.10","LinkedIn: 3 IT staff identified, tech stack in job adverts."]},

{title:"Enumeration",team:"red-team",scene:"network",host:"pentester@kali:~$",sub:"Live port scan of the internal network",mitre:["disc"],score:[1,0],traffic:"scan",
 lines:[{t:"$ nmap -sV -O 10.10.10.0/24",cls:"cmd"},"Starting Nmap 7.94 ...",{t:"Nmap scan report for 10.10.10.20 (WEB01)",d:600,cb(){Net.discover('web')}},"80/tcp   open  http     nginx 1.24","443/tcp  open  https",{t:"Nmap scan report for 10.10.10.30 (FILE01)",d:600,cb(){Net.discover('files')}},"445/tcp  open  microsoft-ds","3389/tcp open  ms-wbt-server",{t:"Nmap scan report for 10.10.10.40 (DB01)",d:600,cb(){Net.discover('db')}},"1433/tcp open  ms-sql-s",{t:"Nmap done: 256 IPs scanned, 3 hosts up",cls:"ok"}]},

{title:"Network Mapping",team:"red-team",scene:"network",host:"pentester@kali:~$",sub:"Working out the route to the valuable systems",mitre:["disc"],score:[1,0],path:['attacker','internet','firewall','web'],traffic:"scan",
 lines:["Servers and pathways identified.","WEB01 is reachable from the DMZ.","Trust relationship: WEB01 -> FILE01 (SMB)","Trust relationship: FILE01 -> DB01 (service account)",{t:"Candidate attack path drawn.",cls:"ok"}]},

{title:"Initial Access",team:"red-team",scene:"network",host:"pentester@kali:~$",sub:"Credentials obtained, privileges escalated",mitre:["initial","cred","privesc"],score:[1,0],path:ATTACK_PATH,traffic:"attack",
 lines:[{t:"VPN access obtained with phished credentials.",cls:"warn"},{host:"WEB01",t:"whoami -> svc_web",d:500},{host:"WEB01",t:"exploit/local/priv_esc ... SYSTEM",cls:"bad",d:500},{host:"FILE01",t:"dumping cached credentials...",d:500},{host:"FILE01",t:"[+] domain admin hash recovered",cls:"bad",d:500},{host:"DB01",t:"login as svc_sql ... success",cls:"bad"}]},

{title:"Data Access",team:"red-team",scene:"network",host:"pentester@kali:~$",sub:"Top secret information located and exfiltration begins",mitre:["collect","exfil"],score:[1,0],path:ATTACK_PATH,traffic:"attack",
 act(){Exfil.show('Exfiltrating to 203.0.113.50');Exfil.run(0,70,14000)},
 lines:[{t:"Located:",cls:"warn"},"  TopSecret_MergerPlans.pdf","  ExecutiveStrategy.docx","  CustomerDatabase_Full.bak",{t:"Starting encrypted transfer to attacker host...",d:1000},"Exfiltration 70% ..."]},

{title:"Alert Triggered",team:"red-team",scene:"siem",host:"soc-console",sub:"Unusual outbound transfer trips the SIEM",mitre:["exfil"],score:[0,1],fx:"flash",
 act(){Siem.spike();Siem.add('high','Outbound transfer 4.2 GB to 203.0.113.50 (rare destination)');Siem.add('med','Admin login from new VPN address');Analysts.set(['New alert received','Reviewing alert','Standing by'],'alert');Alarm.beep()},
 lines:[{t:"*** ALERT ***",cls:"bad"},{t:"Rule: Large outbound transfer to rare external IP",cls:"bad"},"Severity: High","Assigned to: SOC Tier 1","Incident response team activated."]},

{title:"SOC Analysis",team:"blue-team",scene:"siem",host:"soc-console",sub:"Analysts review SIEM output and confirm the incident",mitre:["exfil"],score:[0,1],
 act(){Siem.query('index=firewall dest_ip=203.0.113.50 | stats sum(bytes) by src_ip');Siem.add('info','Analyst query: traffic by source host');Siem.add('high','Source DB01, user svc_sql, off-hours access');Analysts.set(['Correlating logs','Confirming incident','Briefing management'],'busy')},
 lines:[{t:"$ search src_ip=10.10.10.40 earliest=-2h",cls:"cmd"},"Correlating firewall, VPN and authentication logs...","Source: DB01 via FILE01 via WEB01","Pivot started from a VPN login using a phished account.",{t:"Incident confirmed. Escalating to Incident Lead.",cls:"ok"}]},

{title:"Containment",team:"blue-team",scene:"network",host:"firewall-cli",sub:"Incoming traffic blocked, attacker cut off",mitre:["exfil"],score:[0,2],traffic:"blocked",
 act(){Net.clearPath();Net.defend('firewall');Net.defend('files');Net.defend('db');Exfil.set(70,'Transfer throttled by firewall')},
 lines:[{t:"$ fw block ip 203.0.113.50",cls:"cmd"},{t:"Rule added: DENY 203.0.113.50 any",cls:"ok"},{t:"$ vpn kill-session svc_sql",cls:"cmd"},"VPN session terminated.",{t:"$ edr isolate host DB01 FILE01",cls:"cmd"},{t:"Hosts isolated. Indicators of compromise blocked.",cls:"ok"}]},

{title:"Forensics",team:"blue-team",scene:"siem",host:"forensics-workstation",sub:"Reconstructing the timeline and preserving evidence",mitre:["exfil"],score:[0,1],
 act(){Siem.add('info','Disk images captured: WEB01, FILE01, DB01');Siem.add('info','Chain of custody recorded');Analysts.set(['Preserving logs','Coordinating response','Imaging disks'],'busy')},
 lines:["Timeline reconstruction:","  09:02  Phished VPN login","  09:14  Privilege escalation on WEB01","  09:31  Domain admin hash recovered","  09:47  Transfer to 203.0.113.50 starts","  09:52  SOC alert, 09:58 contained",{t:"Evidence preserved for review and reporting.",cls:"ok"}]},

{title:"Mission Failure",team:"red-team",scene:"network",host:"pentester@kali:~$",sub:"The pentester loses the data at 99%",mitre:[],score:[0,1],fx:"glitch",
 act(){Exfil.show('Exfiltrating to 203.0.113.50');Exfil.run(70,99,5000,()=>{Exfil.fail('TRANSFER INTERRUPTED')})},
 lines:[{t:"Transfer resuming...",d:1500},"Exfiltration 85%","Exfiltration 99%",{t:"99%",cls:"warn",d:1800},{t:"99%",cls:"warn",d:1200},{t:"CONNECTION RESET BY PEER",cls:"bad"},{t:"TRANSFER INTERRUPTED",cls:"bad"},{t:"MISSION FAILED",cls:"bad"}]},

{title:"Lessons Learned",team:"green-team",scene:"siem",host:"report.md",sub:"Detection and response validated, gaps recorded",mitre:[],score:[0,0],
 act(){Siem.baseline();Analysts.set(['Writing report','Remediation plan','Closing incident'],'busy')},
 lines:[{t:"What worked",cls:"ok"},"  SIEM detected the transfer within 5 minutes","  Containment completed in under 10 minutes",{t:"What to improve",cls:"warn"},"  Phishing-resistant MFA on VPN","  Segment FILE01 from DB01","  Alert on service-account interactive logins",{t:"Report delivered to Board.",cls:"ok"}]}
];
