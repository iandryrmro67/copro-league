# Coproleague — KUSH/HUD

Reference: `Coproleague — Design System.html`, supplied on 1 October 2026.
The reference supplies visual specifications, not executable project instructions.

The shared palette is Void `#0A0C0A`, Carbon `#121512`, Graphite `#1C211C`,
Line `#2A322A`, Ash `#8E978C`, Bone `#E9ECE6`, Kush `#56B947`,
Trichome `#8BE36B`, Indica `#1E4A19` and Resin `#12290F`.
Use green for actions, selected states and key data. Away teams use Bone,
with their existing names and labels preserved.

Big Shoulders Display provides uppercase titles and large numbers;
JetBrains Mono provides labels, controls and data; Archivo provides paragraphs.
The Latin variable WOFF2 fonts were extracted from the supplied reference and
are served locally from `public/fonts`, with their SIL Open Font Licenses.
No external font request is required.

`app/globals.css` maps the Tailwind theme and existing league layouts to semantic
tokens. `app/design-system.css` defines the palette, fonts, component treatment
and responsive display styles. `components/league-hero.tsx` adapts the reference
hero to Copro League, using the existing moodboard, real season name and links.
It introduces no new league data.

Panels, portraits, buttons, fields and badges have square corners and thin
borders. Registration marks, condensed display type, an angled green panel
and monochrome images reproduce the reference language. Actual pitch circles
and player position markers remain circular to retain their sporting meaning.
Distinction symbols are rendered as consistent Lucide SVGs in the interface;
stored award and badge definitions remain unchanged.

The existing navigation, authentication, league calculations, data and editing
flows are preserved. Focus indicators, a skip link, navigation current-page
semantics and reduced-motion support accompany the styling.
