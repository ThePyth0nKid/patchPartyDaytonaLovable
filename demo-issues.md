# PatchParty — Demo Issues

Test-Issues auf dem Ziel-Repo `ThePyth0nKid/soloPortfolio`, sortiert von simpel nach komplex. Für den Pitch empfohlene Reihenfolge am Ende.

## 🟢 Simpel (~1-2 min pro Agent)

Gute Warm-ups. Jede Persona schickt was Sichtbares ab, Unterschiede sind noch subtil.

### [#1 — Dark-Mode Toggle](https://github.com/ThePyth0nKid/soloPortfolio/issues/1)
Sun/Moon-Button oben rechts, speichert Präferenz in localStorage, respektiert `prefers-color-scheme`.
→ **Persona-Kontrast**: Hackfix=nur Toggle · UX-King=smooth transition + icon-animation · Defender=XSS-safe localStorage handling

### [#3 — Scroll-to-top Button](https://github.com/ThePyth0nKid/soloPortfolio/issues/3)
Floating Button unten rechts, erscheint nach 400px Scroll, smooth scroll nach oben.
→ **Persona-Kontrast**: minimal. Zeigt Unterschied vor allem in Animation & A11y.

### [#4 — Copy-to-Clipboard E-Mail](https://github.com/ThePyth0nKid/soloPortfolio/issues/4)
Button neben der E-Mail-Adresse. Feedback (Tooltip / Icon-Swap) bei Erfolg.
→ **Best für Pitch-Opener**: schnell fertig, visuell sofort erkennbar.

### [#5 — Time-of-day Greeting](https://github.com/ThePyth0nKid/soloPortfolio/issues/5)
Hero zeigt "Good morning/afternoon/evening" je nach Browser-Zeit.
→ **Persona-Kontrast**: Innovator baut sicher noch was drum (Emoji, Animation).

---

## 🟡 Mittel (~2-4 min pro Agent)

Hier zeigen sich die Philosophien richtig.

### [#6 — Skills mit Progress-Bars](https://github.com/ThePyth0nKid/soloPortfolio/issues/6)
Section mit 6-8 Tech-Skills + Icon + animierter Horizontal-Progress-Bar. Animation via IntersectionObserver.
→ **Persona-Kontrast**: Hackfix=static list · Craftsman=typed component + tests · UX-King=smooth stagger animation · Innovator=filterable / sortable.

### [#7 — Keyboard-Shortcuts (Vim-Style)](https://github.com/ThePyth0nKid/soloPortfolio/issues/7)
`j`/`k` für Section-Nav, `g` dann `t` für nach oben. `?` öffnet Help-Modal. Deaktiviert in Form-Inputs.
→ **Persona-Kontrast**: Defender denkt an Event-Isolation, UX-King an das Help-Modal, Craftsman an State-Machine für Chord-Sequences.

### [#8 — Druckbare Resume-Seite /resume](https://github.com/ThePyth0nKid/soloPortfolio/issues/8)
Eigene Route, A4-Druck-Layout, Nav/Footer ausgeblendet beim Drucken.
→ **Persona-Kontrast**: Craftsman macht semantic HTML + print CSS, UX-King denkt an Landing-Button, Innovator bietet PDF-Export.

---

## 🔴 Komplex (~4-7 min pro Agent)

Für den großen Wow-Effekt im Pitch. Mehr Files, mehr Entscheidungen → sehr unterschiedliche Lösungen.

### [#9 — Contact Form mit Validation](https://github.com/ThePyth0nKid/soloPortfolio/issues/9)
Name/Email/Message. Client-side Validation mit Inline-Errors, Submit deaktiviert bis valide.
→ **Persona-Kontrast**: Defender=honeypot + rate-limit + CSRF · Craftsman=typed form + unit tests · UX-King=perfect focus-flow + error-announce · Innovator=draft-auto-save in localStorage.

### [#10 — Career Timeline mit Filter](https://github.com/ThePyth0nKid/soloPortfolio/issues/10)
Vertikale Timeline mit Milestones. Filter-Buttons (All / Work / Education / Projects). Smooth filter transitions.
→ **Persona-Kontrast**: besonders UX-King vs. Hackfix sichtbar. Innovator packt oft Suche / URL-persistent-State dazu.

### [#11 — Case-Study Template /projects/:slug](https://github.com/ThePyth0nKid/soloPortfolio/issues/11)
Dynamic Route. Hero-Image, Tech-Badges, Lightbox-Gallery, Demo/Repo-Links. Mindestens 2 Sample-Case-Studies.
→ **Maximaler Wow-Effekt**. Jede Persona rendert die Seite merkbar anders. Craftsman macht MDX + Frontmatter, Hackfix hardcoded JSON, UX-King spielt mit Scroll-Effekten, Innovator fügt "related projects" hinzu.

---

## 📣 Pitch-Reihenfolge (Empfehlung)

1. **Start** mit `#4 Copy-Email` — schnell, sichtbar, Einstieg ohne Risiko
2. **Beweis**: `#6 Skills Progress-Bars` oder `#10 Timeline` — hier sieht man die Philosophien
3. **Finale**: `#11 Case-Study Template` — "fünf verschiedene Portfolios in einer Minute"

Tipp: vor dem Pitch eine Party auf #11 vorbereiten/cachen, dann im Pitch live auf #4 starten — so hast du den "schnellen Wow" live und den "großen Wow" auf Abruf.

---

## URLs zum Kopieren

```
https://github.com/ThePyth0nKid/soloPortfolio/issues/1
https://github.com/ThePyth0nKid/soloPortfolio/issues/3
https://github.com/ThePyth0nKid/soloPortfolio/issues/4
https://github.com/ThePyth0nKid/soloPortfolio/issues/5
https://github.com/ThePyth0nKid/soloPortfolio/issues/6
https://github.com/ThePyth0nKid/soloPortfolio/issues/7
https://github.com/ThePyth0nKid/soloPortfolio/issues/8
https://github.com/ThePyth0nKid/soloPortfolio/issues/9
https://github.com/ThePyth0nKid/soloPortfolio/issues/10
https://github.com/ThePyth0nKid/soloPortfolio/issues/11
```
