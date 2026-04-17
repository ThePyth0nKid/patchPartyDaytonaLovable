# 🎯 Hackday Playbook — Minute für Minute

**Event:** AI Builders Berlin AI Hackday, Factory Berlin
**Location:** Factory Berlin Mitte, Rheinsberger Str. 76/77
**Project:** PatchParty

---

## 🌅 VOR DEM EVENT (morgens, 9:00–9:45)

### Auf dem Weg zum Event
- [ ] Laptop geladen + Ladekabel
- [ ] Handy geladen (für Tethering-Backup)
- [ ] Kopfhörer (gegen Geräuschpegel)

### Mental
- [ ] Pitch einmal laut durchsprechen (90 Sek)
- [ ] Demo-Issue im Kopf haben, welches Side-Project-Repo du nutzt

---

## 🚪 10:00 — CHECK-IN

- [ ] Ticket scannen
- [ ] Festlegen: "Ich bin Solo" — nicht zu Team-Matching verlocken lassen
- [ ] Platz mit Steckdose + WiFi-Signal wählen
- [ ] Notfall-Option: mobile Hotspot aufsetzen

---

## ⚡ 10:00–10:30 — SETUP (30 Minuten, kritisch)

### T+0 bis T+5: Node & Projekt
```bash
# Check Node-Version (braucht ≥20)
node --version

# Entpacke das PatchParty-Skeleton-Zip
cd ~/Documents  # oder wo immer du arbeitest
unzip patchparty-skeleton.zip
cd patchparty-skeleton

# Öffne in Cursor
cursor .
```

### T+5 bis T+10: API-Keys besorgen

**Anthropic** (falls noch nicht vorhanden — du hast gesagt du hast):
→ https://console.anthropic.com → API Keys → Create Key
→ Copy zu `.env.local`

**Daytona** (neu):
→ https://app.daytona.io → Sign up mit GitHub
→ Dashboard → API Keys → Create Key
→ Copy zu `.env.local`
→ WICHTIG: Du bekommst $200 Free Credits laut Event-Page (plus $100 mit billing setup — skip das jetzt)

**GitHub PAT** (schnellster Weg, kein OAuth-Setup):
→ https://github.com/settings/tokens
→ Generate new token (classic)
→ Scopes: **`repo`** (für PR creation) und **`read:user`**
→ Copy zu `.env.local`

### T+10 bis T+13: Env setup
```bash
cp .env.example .env.local
# Öffne .env.local und paste die 3 Keys
```

### T+13 bis T+25: Install + Local Test
```bash
npm install
# Während das läuft: Wasser holen, atmen

npm run dev
# Sollte auf http://localhost:3000 starten
```

**Mini-Smoke-Test** (T+20 bis T+25):
1. Öffne localhost:3000 — siehst du die Landing-Page mit 5 Icons?
2. Check Browser-Console: keine 500er-Fehler?
3. Paste eine fake URL ins Input, klick Submit → sollte "Could not fetch issue" zeigen (das ist erwartet — GitHub-Call funktioniert)

Wenn das klappt: **Setup fertig. Du bist jetzt besser dran als 80% der Teilnehmer.**

### T+25 bis T+30: Git + Railway Init
```bash
# Git lokal initialisieren (aber NOCH NICHT PUSHEN)
git init
git add .
git commit -m "initial skeleton"

# Bereite Railway vor, aber deploye noch nicht
# → railway.app → New Project → wird später connected
```

---

## 🎪 10:30 — TEAM MATCHING

- Claude die nächsten 15 Min. bestimmen lassen:
  - Wenn jemand sehr Design/UX-stark da ist und alleine, erwäge Pair-Up für besseren UI-Polish
  - Wenn du einen starken Pitch-Vibe bei jemand spürst, ebenso
  - **Default:** Solo bleiben. Du hast Skeleton, du hast den Plan, Team kostet Onboarding-Zeit.

---

## 🔨 11:00–11:30 — FIRST END-TO-END (Kritische 30 Minuten)

**Ziel: Bis 11:30 muss EINE komplette Party mit EINEM Agent live funktionieren**

### Die kritische Frage zuerst (Minute 0–5)
Öffne Claude Code im Cursor und gib ihm das als erstes:

```
Read src/lib/agent.ts and understand the current flow.
Test that the Daytona SDK works by running:
- Create a sandbox
- Execute `echo "hello"` in it
- Delete the sandbox

If that works, we're good. If not, we debug first.
```

### Happy-Path-Test (Minute 5–25)
1. Pick ein Demo-Issue aus deinen Side-Projects
   - Klein: "Add a rate limit to the /api/foo endpoint"
   - Oder: "Add dark mode toggle to landing page"
   - Wichtig: Repo muss **public** sein (wegen GitHub-PAT-Scope)
2. Starte localhost:3000
3. Paste Issue-URL
4. Klick "Let's Party"
5. Beobachte die 5 Panels

**Was KÖNNTE schiefgehen und wie du reagierst:**

| Problem | Wahrscheinlichkeit | Fix |
|---|---|---|
| Daytona-SDK-Version-Mismatch | Mittel | `npm install @daytonaio/sdk@latest` + ask Claude Code to fix type errors |
| Agent crasht beim Code-Parse | Hoch | Personas antworten nicht immer sauber JSON. Fallback: bitte Claude Code in `agent.ts` robusten JSON-Parser einbauen |
| Repo-Clone im Sandbox zu langsam | Niedrig | shallow-clone: `git clone --depth 1` in `agent.ts` ändern |
| GitHub-Issue-Fetch failt | Niedrig | Token-Scope falsch. Check `repo`-Scope aktiv. |

### Minute 25–30: Ehrlicher Checkpoint
**Frage dich:** Läuft EIN Agent bis zum Commit im Sandbox?
- **Ja** → Go to 11:30 Plan
- **Nein** → STOP. Scope-Reduktion. Nur 3 Personas statt 5. Keine PR-Creation. Nur Diff-Display.

---

## 🏗️ 11:30–13:00 — CORE BUILD (1.5h)

**Ziel: Parallelität + UI polish**

### 11:30–12:15 — Alle 5 Personas laufen parallel
```
Prompt für Claude Code:
"In api/party/start/route.ts, verify all 5 personas are spawned concurrently
with Promise.allSettled-like behavior. Check via logs that we see 5 
'Initializing sandbox' events within 2 seconds of request."
```

### 12:15–12:45 — Compare-View polishen
```
Prompt für Claude Code:
"In the party page ComparePanel, improve the code display:
- Add syntax highlighting (use prism or highlight.js)
- Make it scroll nicely
- Add file-tree sidebar if multiple files"
```

### 12:45–13:00 — Erster Deploy auf Railway
```bash
# Push zu GitHub (jetzt erst!)
git remote add origin https://github.com/YOUR_USERNAME/patchparty.git
git push -u origin main

# Railway → New Project → from GitHub → select repo
# Set env vars in Railway dashboard (copy from .env.local)
# Deploy kicks off automatically
```

**KRITISCH:** Railway URL notieren. Das ist deine Pitch-URL.

---

## 🍕 13:00–13:30 — LUNCH (produktiv)

- Essen nehmen, aber zurück am Laptop
- Parallel: Pitch-Skript laut durchsprechen (90 Sek)
- Check: Läuft der deployte Railway-Build? → Öffne URL auf Handy, teste Happy-Path

---

## 🎨 13:30–15:00 — POLISH + RESILIENCE (1.5h)

### 13:30–14:00 — Error-Handling
```
Prompt: "In agent.ts, make sure that if Claude returns malformed JSON, 
we retry once with a 'Please return valid JSON only' prompt. If still 
fails, mark agent as error but don't crash others."
```

### 14:00–14:30 — Visual Polish
- Loading states überall
- Party-URL zur Clipboard copy Button
- Success-State der PR-Creation schön
- Favicon + Meta-Tags

### 14:30–15:00 — "Hybrid Merge" Easter Egg (optional)
Wenn Zeit: Wenn User 2 Agents gepickt hat, biete "Merge both" an. Feature zum Angeben im Q&A.

---

## 🎬 15:00–15:45 — DEMO-PREP (45 min, HEILIG)

### 15:00–15:15 — FULL RUN-THROUGH
- Starte frischen Browser
- Von Home → Party → PR-Create durchklicken
- **Nichts anfassen, nichts verändern**
- Zeit stoppen: sollte unter 3 Minuten bleiben

### 15:15–15:30 — BACKUP-VIDEO DREHEN
```bash
# Auf Mac: Cmd+Shift+5 → Record selected window
# Auf Windows: Win+G (Game Bar) oder OBS
```
- 30-45 Sek Happy-Path-Video
- Speichere auf Desktop UND iCloud/Drive (2 Kopien!)
- **Das ist dein Lebensretter bei Bühnen-WiFi-Fail**

### 15:30–15:45 — PITCH RESTLOS POLIEREN
- 3× laut üben mit Stoppuhr
- Vor Spiegel oder Kollege
- Final: Browser-Tab auf Demo-Issue geöffnet, Cursor weg, Vollbild ready

---

## 🎤 15:45–16:15 — FINAL POLISH + REPO

### Repo public + clean
```bash
# README.md final checken — Demo-Screenshot hinzufügen
# MIT License prüfen
git push
```
- GitHub-Stars-Button aktivieren (das Repo)
- Repository Description + Topics setzen (für Discoverability)

### URL-Check
- Deployte URL auf Handy testen (mobile funktioniert?)
- Backup-Video als Tab offen lassen

---

## 🏆 16:15 — PITCH TIME

### Vor dem Gehen auf die Bühne
- [ ] Laptop an Beamer/Screen ready
- [ ] Browser: Home-Page geöffnet, URL sichtbar in URL-Bar
- [ ] Demo-Issue-URL im Clipboard (Cmd+V-ready)
- [ ] Backup-Video in anderem Tab (nicht sichtbar)
- [ ] Atmen. Lächeln.

### Der Pitch (90 Sek)

**0–12s — Hook (du stehst, schaust ins Publikum):**
> "In 2026 sind 46 Prozent des Codes von AI geschrieben. AI-PRs haben 1.7 mal mehr Bugs als menschlicher Code. Im März hat Anthropic selbst ein Code-Review-Tool launchen müssen — weil Claude Code so viele Pull-Requests produziert, dass Enterprise-Teams ertrinken. Der Bottleneck ist nicht mehr Generation — es ist Auswahl."

**12–25s — Solution:**
> "PatchParty gibt dir fünf. Ein GitHub-Issue rein, fünf parallele Claude-Agents in isolierten Daytona-Sandboxes, fünf radikal verschiedene Pull-Requests zur Wahl."

**25–70s — Live Demo:**
- Paste Issue-URL aus Clipboard
- Klick "Let's Party"
- Wechsel zur Party-View
- 5 Panels füllen sich parallel (nicht kommentieren, einfach atmen lassen)
- Nach ~30 Sek Fortschritt: "Fünf Implementierungen live in fünf Sandboxes. Hackfix macht's minimal. Craftsman schreibt Tests. Defender validiert alles."
- Wenn fertig: Click auf einen → Compare öffnet
- "Ich wähle Defender." → Pick-Button → PR-URL erscheint

**70–90s — Close:**
> "Das ist kein Code-Review-Tool. Es ist ein Entscheidungs-Interface für die Agent-Ära. Statt einer AI zu vertrauen, wählst du aus fünf. Live unter [patchparty.railway.app]. Open Source. Danke."

### Bei Q&A

**"Wie unterscheidet sich das von CodeRabbit?"**
→ "CodeRabbit reviewt einen bestehenden PR. Wir generieren fünf Alternatives zum Wählen. Andere Kategorie."

**"Skaliert das kostenmäßig?"**
→ "Fünf Opus-Calls plus fünf Sandbox-Sekunden — ca. 50 Cent pro Party. Viel günstiger als ein Senior-Review."

**"Was wenn Agents alle ähnlichen Code schreiben?"**
→ "Die Personas sind bewusst konträr gestaltet. Hackfix würde dir nie Security einbauen, Defender würde nie ohne Validation submitten. In unseren Tests divergieren die Outputs signifikant."

**"Wie geht ihr mit Plagiat-Risiko um?"**
→ Ruhig bleiben: "Projektstruktur wurde vor Ort aufgesetzt mit `create-next-app`, alle Feature-Implementation heute. Repo-History spricht für sich."

---

## 📬 17:30 — WINNERS

### Wenn du gewinnst
- Bühne genießen, Foto machen lassen
- Daytona-Team direkt ansprechen: Ivan Burazin? Vedran Jukic? Visitenkarte.
- Lovable-Team (Anton Osika ist aktiv): dank
- Twitter/LinkedIn-Post noch am Abend mit Demo-Video

### Wenn du nicht gewinnst
- Mit Judges sprechen: "What would have made this a winner?"
- Winners beglückwünschen, Kontakt tauschen
- Das Projekt bleibt online — ist nicht weg

In beiden Fällen: **LinkedIn-Post mit Lessons Learned und Demo-Video**. Das Projekt lebt weiter.

---

## 🆘 EMERGENCY-PLAYBOOK

### Wenn Daytona um 12:00 nicht funktioniert
→ Fallback zu E2B oder Mock-Sandboxes. Agent läuft lokal statt in Sandbox. Verliert Daytona-Bonus aber liefert Demo.

### Wenn Claude-API rate-limitet
→ Sonnet statt Opus als Fallback. In `agent.ts` model string ändern.

### Wenn nichts bis 14:00 funktioniert
→ Scope-Emergency: 1 Agent only. Demo zeigt "proof of concept". Pitch umfokussieren auf Vision.

### Wenn WiFi bei Pitch ausfällt
→ Backup-Video abspielen. "Unser Live-Demo kostet euch 45 Sekunden — oder wir zeigen das aufgenommene, wenn das WiFi streikt."

---

**Let's ship. 🎉**
