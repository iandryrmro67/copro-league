# Animations Copro League — livraison du 4 octobre 2026

## Version publiée

- Source applicative : `f88b188b7f246a75f76c0c82db700e78d1dd277c`, branche GitHub `codex/vercel-supabase`.
- Site : https://copro-league.vercel.app ; démo : https://copro-league.vercel.app/dev/animations.
- Candidat : https://copro-league-18xc8liok-yurr2.vercel.app ; id `dpl_8KmWKGQaoxLYaPzoMentB5yKrtEV`.
- Compilation et TypeScript distants réussis ; état Ready avant promotion. L’inspection canonique retrouve ce même id. `/api/version` (no-store) et les métadonnées de la page renvoient le SHA ci-dessus. Le SHA GitHub a été vérifié avant déploiement ; le commit documentaire suivant ne modifie pas l’application.
- Publication CLI explicite. La branche historique `main` et la connexion Git automatique n’ont pas été modifiées.
- Retour sans restauration de base : version animée antérieure https://copro-league-l1wyd1hse-yurr2.vercel.app (`dpl_8ue9LsuL5Njb5vR9uPqQFc39Qh3Y`, `f4d5b2b`) ; version avant animations https://copro-league-qnk1kk3ge-yurr2.vercel.app (`dpl_FASCC2eANhcjVzdKmn33aSuej6WC`, `e58f191`).

## Vérifications

136 tests réussis, aucun échec ; compilation production locale et Vercel réussies. Les contrôles HTTP publics et les refus d’accès anonyme à l’administration, écritures, exports et vidéos privées ont réussi après la dernière promotion. Les fichiers d’animation ajoutés ont zéro erreur lint et trois avertissements concernant des images SVG locales ; les fichiers d’intégration hérités passent de 29 à 24 erreurs préexistantes. Le lint global n’est donc pas déclaré propre.

Revue indépendante unique de `dae516b..8bd5b4e` : un problème critique et deux importants, aucun mineur. Corrections : protection de l’historique de l’éditeur, curseur natif dans les dialogues, déplacement instantané/poignée retirée en mouvement réduit. Tests comportementaux RED→GREEN, puis contrôles navigateur ciblés. Deux problèmes de fiabilité initialement considérés préexistants ont aussi été corrigés : accès au stockage refusé par le navigateur et conservation de l’éditeur lors d’une erreur de revalidation. Le dernier correctif restaure le focus de la démo après fermeture du badge.

Parcours CUA : chargement réel/erreur fictive/skip ; navigation et focus du menu ; joueurs, statistiques, draft, awards et replays ; gestes via boutons/clavier et mouvement réduit ; stockage indisponible et retour navigateur sur le vrai MatchEditor en fixture locale. Match 6 publié : vidéo → saisie précise → timeline, treize familles d’actions, brouillon récupéré et joueur conservé après ouverture/fermeture du menu. Aucun résultat ni événement enregistré sur la production. La récupération peut actualiser les métadonnées du brouillon local.

Largeurs réellement contrôlées : 390 et 768 px, aucun débordement horizontal. La dernière version a été rouverte dans des onglets neufs et son SHA lu dans le DOM. Les vérifications de viewport/clavier ne constituent pas un test matériel du gyroscope, de l’haptique ou de chaque navigateur mobile. L’orientation reste opt-in avec boutons de remplacement ; le son est désactivé par défaut.

## Audits et décalages

Lighthouse 13.5.0, Chrome officiel en headless, profil mobile par défaut, trois chargements froids de la build production locale finale sur `/dev/animations`. Cette page est autonome, avec des fixtures fictives et sans requête Supabase ; ces scores ne sont pas un audit de toutes les pages ni du réseau Vercel.

| Passage | Performance | Accessibilité | CLS initial | LCP ms | TBT ms |
|---|---:|---:|---:|---:|---:|
| 1 | 94 | 100 | 0.000630919 | 3157.0 | 46 |
| 2 | 94 | 100 | 0.000630919 | 3156.6 | 31 |
| 3 | 94 | 100 | 0.000630919 | 3156.5 | 4 |

Médiane performance : 94/100 ; accessibilité : 100/100. Rapports HTML/JSON locaux ignorés : `outputs/animations-audit/final-mobile-{1,2,3}.report.*`.

Le compteur DOM après chargement des polices était 0.0000 sur les essais desktop ciblés. La dernière vérification mobile publiée atteint 0.0214 pendant la stabilisation initiale, puis ne monte plus lors des sélections/retraits répétés des cartes et du déblocage/fermeture du badge. Le redimensionnement à chaud produit des entrées dans ce compteur et doit être exclu de la mesure ; le chargement initial est mesuré séparément par Lighthouse. On ne revendique pas un CLS nul sur toutes les pages ou tous les scénarios.

Capture finale du menu : `outputs/production-game-menu.png` (capture du domaine canonique, SHA final).

## Journal d’exécution et décisions

Le journal est conservé ci-dessous avant suppression du seul espace de travail temporaire associé au plan. Les quatre décisions « Ruling » sont exhaustives ; aucun point mineur reporté.

# SDD ledger — plan: docs/superpowers/plans/2026-10-04-game-animations.md
Baseline: dae516b; 124 tests green, production build and access HTTP checks green at handoff.
Isolation: existing linked worktree work/vercel, codex/vercel-supabase.
Pre-flight: tasks 1→2/3/4/5 share pure state; task 2→3/5/6 shares busy/reduced/sound; signatures consistent.
Pre-flight: task 3 editor navigation event flushes synchronously; existing debounce retained.
Task 1: complete (commits dae516b..24303d1, tests: npm test → ℹ duration_ms 1465.821625)
Task 2: complete (commits 24303d1..e279177, tests: npm test → ℹ duration_ms 1465.0525)
Task 3: complete (commits 24303d1..e279177, tests: npm test → ℹ duration_ms 1433.013084)
Task 4: complete (commits e279177..93817cc, tests: npm test → ℹ duration_ms 1717.526292)
Task 5: complete (commits 93817cc..16ea82b, tests: npm test → ℹ duration_ms 1384.495375)
Task 6: complete (commits 32fbaf3..16ea82b, tests: npm test → ℹ duration_ms 1427.00075)
Execution note: tasks 2/3 share one coherent provider/navigation integration commit; later UI checks are included in task 7.
Final review: independent read-only reviewer gpt-6-astra reviewed dae516b..8bd5b4e; 1 Critical, 2 Important, no Minor.
Final: fixed history draft protection — entering and leaving admin creates document history protected by beforeunload; navigationKind RED→GREEN and real MatchEditor local quota/Back retains the edited field.
Final: fixed top-layer cursor disappearance — cursorAllowed modal case RED→GREEN; real menu before fix had native cursor none; native modal override and busy cleanup now restore pointer.
Final: fixed reduced card translation and inert grip — carouselTransition/SSR actual carousel test RED→GREEN; position duration zero and grip omitted under reduced motion.
Final: Ruling: persistent client routing versus editor history safety — admin entry/exit and query-only changes use document navigation; other public routes retain client transitions — cost is a fresh page/data load around administration, preserving its beforeunload warning.
Final: Ruling: reviewer set aside baseline lint — retain preexisting violations outside animation components; baseline integration files29errors, current24; new files0errors3local SVG image warnings — cost is existing maintenance debt; production TypeScript/build remain required.
Final: Ruling: reviewer set aside localStorage getter/refresh teardown — promote these to reliability findings and fix lazy storage access plus cached-page retention; SecurityError getter and actual SSR refresh view RED→GREEN — cost if coverage is incomplete is loss of unsaved state under exceptional browser/network conditions.
Final: Ruling: reviewer set aside deployment/device/audit evidence — executor performs real audits, fresh-tab checks, HTTP security and canonical SHA verification before declaring publication — cost if verification is wrong is an old release or unobserved device regression.
Final: no deferred minors.
Final: suite 136/136 green, local production build green, new animation files lint 0 errors (3 local SVG image warnings); full integration baseline lint debt retained.
Final: badge demo opener focus loss reproduced on published f4d5b2b (BODY after close), fixed without disabling opener while native dialog makes background inert; latest local close restores BUTTON, animation CLS readout 0.0000.
Final: three cold mobile Lighthouse runs of the final application code: performance 94/94/94, accessibility 100/100/100, initial CLS approximately 0.000631; reports retained in outputs/animations-audit/final-mobile-*.
Task 7: complete (commits 16ea82b..f88b188, tests: npm test → ℹ duration_ms 1725.496625)
Final: published f88b188b7f246a75f76c0c82db700e78d1dd277c from GitHub production branch to dpl_8KmWKGQaoxLYaPzoMentB5yKrtEV; candidate Ready, promoted, canonical inspect/API no-store/page metadata match; final anonymous access HTTP suite green.
Final: canonical fresh admin tab confirms 13 actions, selected Clovis retained after menu close; no production match save. Fresh mobile lab 390px has no horizontal overflow; automatic badge close restores opener focus. Initial manual CLS readout reaches 0.0214 during mobile settling, then remains unchanged across repeated card selection/removal and badge unlock; viewport resizing is excluded from animation claims. Local desktop close readout was 0.0000.
