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

On 2 October 2026, the implementation from `6074806` was integrated into the
Vercel/Supabase source alongside the new match analysis workflow and timeline.
The annotation workspace now consumes the shared palette and font variables;
deploying this checkout includes both the global design and the analysis UI.

## Animations intégrées — 4 octobre 2026

Les tokens et polices canoniques sont dans `app/tokens.css`. Les effets sont isolés dans `app/animations.css`, avec Motion chargé par `AnimationProvider` dans le layout persistant. Le HUD et GameMenu remplacent la navigation précédente ; les carousels complètent les joueurs, les participants, les capitaines et la révélation Pack. BadgeViewer accompagne les collections et les trophées ; les célébrations comparent uniquement deux réponses réussies d’un même profil pendant la session.

La saisie précise et ses treize actions conservent leurs contrôles fixes. Une navigation interne persiste immédiatement le brouillon local ; un conflit ou un stockage indisponible bloque le départ. Connexion/déconnexion gardent une navigation complète. Les réponses privées ne sont jamais persistées par la couche d’animation.

La route `/dev/animations` permet de rejouer les cinq groupes avec des fixtures locales, un mode réduit et une erreur de chargement. Elle ne demande aucune donnée Supabase. Le son reste désactivé par défaut et l’orientation mobile demande une activation explicite. Les gestes possèdent des boutons équivalents ; le menu fournit focus, flèches et Échap. Le mouvement réduit supprime les déplacements décoratifs.

La revue a conduit à garder les entrées/sorties de l’administration dans un historique de documents : précédent/suivant déclenche ainsi la protection native beforeunload, y compris en cas de quota. Les autres routes publiques gardent leur navigation client. Le curseur natif reste visible dans les dialogues de la couche supérieure ; le mode réduit place immédiatement les cartes et retire la poignée de geste inactive. Une erreur de revalidation conserve les données et l’éditeur déjà affichés, avec Réessayer. L’accès au stockage est différé à l’intérieur des protections existantes contre les exceptions navigateur.
