# Game Animations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Intégrer les cinq animations au site existant, publier le code sur GitHub et vérifier que le domaine Vercel principal sert cette réalisation.

**Architecture:** Couche Motion commune dans le layout persistant, composants réutilisables et raccordements locaux aux joueurs, à la draft et aux distinctions. Les données restent fournies par les API existantes ; la démo utilise des fixtures. Le moteur de statistiques, les autorisations et la timeline précise sont conservés.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind, Motion, Supabase existant.

**Spec:** `docs/superpowers/specs/2026-10-03-game-animations-design.md` — proposition validée par la demande d’intégration du 4 octobre 2026.

## Global Constraints

- Travailler dans `/Users/herkulesfitness/Documents/ChatGPT/Copro league/work/vercel`, branche `codex/vercel-supabase` ; ne pas déployer la racine historique.
- Motion est la seule dépendance produit ajoutée. Pas de GSAP nécessaire pour la séquence prévue ; pas de composants premium Motion+ ni de service payant.
- Toutes les animations de propriétés utilisent uniquement transform et opacity.
- Palette : Void #0A0C0A, Carbon #121512, Graphite #1C211C, Line #2A322A, Ash #8E978C, Bone #E9ECE6, Kush #56B947, Trichome #8BE36B, Indica #1E4A19, Resin #12290F.
- Big Shoulders Display 800/900 pour les titres, JetBrains Mono pour le HUD et les nombres, Archivo pour le texte ; coins carrés, grille de 8 px.
- Entrée `[.22, 1, .36, 1]`, sortie `[.64, 0, .78, 0]`, micro 150–250 ms, transition 350–600 ms, séquences longues 800–1500 ms, fondus réduits 150 ms.
- Focus : contour Kush 1 px, décalage 2 px. Cibles tactiles d’au moins 44 px. Aucun contrôle exclusivement fondé sur un geste.
- Une seule animation dominante joue à la fois. Son désactivé au premier chargement, au plus 120 ms après activation utilisateur.
- Aucune réponse privée dans sessionStorage, localStorage, cache HTTP partagé ou démo. Les brouillons locaux existants gardent leur stockage privé par propriétaire/match.
- Aucune donnée fictive enregistrée dans les matchs de production ; aucune migration Supabase nécessaire.
- Mesurer Lighthouse avant de déclarer un score ; objectif médiane mobile ≥90 sur trois audits de la build de production de la démo.

## Review Focus

1. L’utilisateur navigue moins de 350 ms après une modification : sauvegarder l’état actuel avant de quitter ; si stockage indisponible/conflit, conserver l’éditeur et indiquer l’action nécessaire.
2. Erreur API, blocage des polices ou sessionStorage refusé : aucun écran de chargement ou rideau ne bloque le site indéfiniment.
3. Double clic, touche modificatrice, téléchargement, connexion ou retour arrière : une seule navigation normale et conservation des comportements natifs.
4. Changement de joueur/saison et premier chargement des badges : aucune fausse célébration ni mélange entre projections et trophées définitifs.
5. Mobile avec scroll vertical, clavier dans un champ et mouvement réduit : ne pas détourner ces interactions pour déclencher des gestes ou le menu.

---

## Structure des fichiers et interfaces

Créer : `app/tokens.css`, `app/animations.css`, `lib/motion.ts`, `lib/animation-state.ts`, `components/animations/AnimationProvider.tsx`, `BootScreen.tsx`, `CardCarousel.tsx`, `GameMenu.tsx`, `BadgeViewer.tsx`, `BadgeUnlock.tsx`, `HoverTile.tsx`, `HoverButton.tsx`, `HoverLink.tsx`, `HudLabel.tsx`, `CustomCursor.tsx`, `LeagueDataProvider.tsx`, `components/league-replays.tsx`, `app/dev/animations/page.tsx`, `components/animations/AnimationLab.tsx`, `app/api/version/route.ts`, `tests/animation-state.test.ts`, `tests/animated-navigation.test.ts`.

Modifier : `package.json`, verrou de dépendances, `app/layout.tsx`, `app/design-system.css`, `components/league.tsx`, `components/league-draft.tsx`, `components/league-recognition.tsx`, `components/league-admin.tsx`, `tests/access-http.mjs`, `docs/design-system.md`, `docs/vercel-supabase.md`.

Interfaces communes, à documenter dans le fichier de chaque composant :

```ts
type BootTasks = { fonts: boolean; image: boolean; data: boolean };
type UnlockBadge = { id: string; active: boolean };
type NavigationClick = {
  button: number; ctrlKey: boolean; metaKey: boolean;
  shiftKey: boolean; altKey: boolean;
};
type BeforeNavigateDetail = { href: string; allowed: boolean };
// lib/animation-state.ts : sans import de React, de DOM ou de données serveur.
function bootProgress(tasks: BootTasks): number;
function snapIndex(index: number, offset: number, velocity: number,
  step: number, count: number): number;
function unlockedIds(before: UnlockBadge[] | null, after: UnlockBadge[],
  seen: ReadonlySet<string>): string[];
function shouldAnimateNavigation(click: NavigationClick,
  href: string, origin: string, target?: string, download?: boolean): boolean;
// AnimationProvider : routage, son, arbitre d'overlays, préférence réduite.
type AnimationContext = {
  reduced: boolean; sound: boolean; setSound: (enabled: boolean) => void;
  busy: boolean; navigate: (href: string) => Promise<boolean>;
  play: (kind: 'snap' | 'select' | 'open') => void;
};
// LeagueDataProvider : state en mémoire navigateur, revalidation et déduplication.
type LeagueDataContext = {
  data: League | null; error: string; initialTasks: BootTasks;
  refresh: () => Promise<League>;
};
```

### Task 1: Fondations Motion, tokens et états testables

**Files:** dépendances, tokens, constantes, état pur et `tests/animation-state.test.ts`.

**Interfaces:** produit les types/fonctions pures ci-dessus et `durations`, `eases`, `fade`, `slide` dans `lib/motion.ts`. Les constantes de durée sont exprimées en secondes pour Motion ; les timers convertissent explicitement en millisecondes.

- [ ] Ajouter les tests comportementaux avant l’implémentation :

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {bootProgress, snapIndex, unlockedIds} from '../lib/animation-state.ts';
test('progression bornée aux tâches réellement terminées', () => {
  assert.equal(bootProgress({fonts: false, image: false, data: false}), 0);
  assert.equal(bootProgress({fonts: true, image: false, data: false}), 30);
  assert.equal(bootProgress({fonts: true, image: true, data: true}), 100);
});
test('un glisser ne dépasse jamais la pile ni une pile vide', () => {
  assert.equal(snapIndex(0, 800, 0, 300, 4), 0);
  assert.equal(snapIndex(3, -800, 0, 300, 4), 3);
  assert.equal(snapIndex(0, -200, 0, 300, 0), 0);
});
test('les badges historiques et déjà célébrés ne sont pas nouveaux', () => {
  const active = [{id: 'a', active: true}];
  assert.deepEqual(unlockedIds(null, active, new Set()), []);
  assert.deepEqual(unlockedIds([{id: 'a', active: false}], active,
    new Set(['a'])), []);
  assert.deepEqual(unlockedIds([{id: 'a', active: false}], active,
    new Set()), ['a']);
});
```

- [ ] Lancer `npm test` et constater l’échec dû au module absent.
- [ ] Installer `motion`, conserver le verrou existant, puis implémenter les fonctions et variantes. Par exemple :

```ts
export const eases = {enter: [.22, 1, .36, 1], exit: [.64, 0, .78, 0]} as const;
export const durations = {micro: .22, page: .6, badge: .35, reduced: .15} as const;
export function bootProgress(tasks: BootTasks) {
  return Number(tasks.fonts) * 30 + Number(tasks.image) * 10 + Number(tasks.data) * 60;
}
```

- [ ] Déplacer les tokens et font-face dans `tokens.css`, garder les alias, importer après globals et avant les règles du design system. Corriger le focus. Ajouter les feuilles d’effets sans toucher aux styles métier.
- [ ] Relancer les tests et vérifier le diff des variables avant commit `Add shared motion tokens and animation state`.

### Task 2: Fournisseur persistant, chargement et BootScreen

**Files:** `AnimationProvider.tsx`, `LeagueDataProvider.tsx`, `BootScreen.tsx`, layout, chargement de `league.tsx`.

**Interfaces:** consomme `BootTasks` et `bootProgress`, produit les deux contextes ; `BootScreen` reçoit `tasks`, `seasonName`, `playerCount`, `matchCount`, `error`, `onClose`, et un drapeau `demo` qui ne touche pas sessionStorage.

- [ ] Tester la progression quand la donnée n’est pas prête, puis vérifier les transitions boot/erreur/skip via la future démo. Réutiliser des promesses contrôlées plutôt qu’un pourcentage aléatoire.
- [ ] Charger les features Motion à la demande. Stocker la ligue uniquement dans le provider client ; une requête en cours est réutilisée, son AbortController et son timeout sont nettoyés.
- [ ] Observer `document.fonts.load` pour les trois polices locales et `Image.decode` pour le logo ; marquer uniquement les groupes effectivement prêts. Les échecs affichent un état de secours et libèrent l’intro.
- [ ] Implémenter délais 300 ms/600 ms/minimum 1,2 s/maximum 8 s ; timeout API 10 s, bouton Réessayer existant. Calques fixes, scaleX de la barre, masque du logo, rideaux transformés. Chiffres tabulaires, noms/comptes réels.
- [ ] Vérifier dans le navigateur le premier chargement, reload, stockage refusé simulé dans une fixture, erreur API fictive et PASSER. Le contenu du site et les erreurs restent accessibles.
- [ ] Relancer `npm test` et `npm run build`, puis commit `Integrate real loading boot and persistent animation provider`.

### Task 3: Menu, navigation protégée et Replays

**Files:** `GameMenu.tsx`, `AnimationProvider.tsx`, `league.tsx`, `league-admin.tsx`, `league-replays.tsx`, `tests/animated-navigation.test.ts`.

**Interfaces:** menu reçoit saison, URL courante et droits/compte. Les liens appellent `navigate(href)` uniquement après `shouldAnimateNavigation`. L’événement DOM annulable `copro:before-navigate` porte `BeforeNavigateDetail` ; le MatchEditor persiste `current.current`, sans attendre le debounce.

- [ ] Ajouter et exécuter les tests natifs ci-dessous avant d’implémenter le filtrage :

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldAnimateNavigation} from '../lib/animation-state.ts';
const click = {button: 0, ctrlKey: false, metaKey: false,
  shiftKey: false, altKey: false};
test('la connexion, les téléchargements et les nouveaux onglets restent natifs', () => {
  const origin = 'https://copro-league.vercel.app';
  assert.equal(shouldAnimateNavigation(click, '/connexion', origin), false);
  assert.equal(shouldAnimateNavigation({...click, metaKey: true}, '/stats', origin), false);
  assert.equal(shouldAnimateNavigation(click, '/api/export', origin, '', true), false);
  assert.equal(shouldAnimateNavigation(click, '/stats', origin), true);
});
```

- [ ] Implémenter liens sémantiques, dialogue plein écran, focus, flèches 2/3 colonnes, M hors champs/analyseur, Échap, cascade et calque de sélection. Maintenir accueil, saisons, glossaire et admin autorisé.
- [ ] Ajouter séquence `idle → covering → route-change → uncovering → idle`, bloquer seulement les doubles navigations normales, libérer sur erreur/délai maximal. Ne pas faire de remontage volontaire des enfants.
- [ ] Dans MatchEditor, la sauvegarde anticipée conserve la version et le propriétaire. En échec, annuler la navigation et afficher le statut existant ; en conflit, conserver la notice et le brouillon conflictuel. Conserver beforeunload pour les navigations natives.
- [ ] Étendre les tests de brouillons avec stockage qui lève une exception et modification immédiatement avant navigation. Parcours local du vrai éditeur : ouvrir/fermer MENU conserve les champs ; quitter puis revenir récupère le brouillon.
- [ ] Ajouter la branche `/replays` dans LeagueApp, filtrée depuis les matchs visibles par saison/période ; liens vers `/matchs/:id?tab=video`, état vide, aucune modification des politiques média.
- [ ] Vérifier mobile, touches modificatrices, back/forward, URL avec paramètres et absence d’overlay bloqué ; tests et compilation, commit `Add game menu and safe animated navigation`.

### Task 4: Carousel joueurs et draft

**Files:** `CardCarousel.tsx`, listes de joueurs de `league.tsx`, `league-draft.tsx`, CSS.

**Interfaces:** `CardCarousel<T extends {id: string}>` reçoit `items`, `renderItem(item)`, `getLabel(item)`, `selectedIds`, `onSelect(item)`, `onReturn(item)`, `selectLabel` et `returnLabel`. Les callbacks changent le métier une seule fois ; le composant n’effectue aucun fetch.

- [ ] Étendre les tests de `snapIndex` aux vitesses élevées, au dernier index et à une pile réduite par filtre. Le parent réajuste l’index si l’élément courant disparaît.
- [ ] Implémenter track drag x, momentum/snap, voisins .86/.5, règle de position, boutons et clavier. Molette horizontale et Shift+molette uniquement ; ne pas consommer une molette verticale ordinaire.
- [ ] Ajouter zone de geste verticale identifiée, seuil et fin de geste distincte du clic. Tilt ±8°, reflet 18 %, sélection/retour et haptique 8 ms. Orientation via activation explicite, refus sans erreur et cleanup.
- [ ] Raccorder les joueurs filtrés à l’ouverture de profil et garder leur grille. Dans la draft, extraire une fonction locale commune à la checkbox et au carousel :

```ts
function chooseParticipant(id: string, selected: boolean) {
  setRoster(selected ? [...new Set([...players.map(p => p.id), id])]
    : players.filter(p => p.id !== id).map(p => p.id));
  setTeams({}); setLocks({}); setCapA(''); setCapB('');
}
```

- [ ] Raccorder capitaines/pack aux fonctions existantes sans toucher à balancedDraft, au tour serpent ni aux conditions de validation. Désactiver les gestes de retour pour les cartes non retirables du tour courant.
- [ ] Vérifier sur fixture une sélection, un retrait, un changement de match, chaque mode de draft, le scroll mobile et le mouvement réduit. Tests/compilation puis commit `Integrate player gestures into profiles and draft`.

### Task 5: Badges, trophées et déblocage

**Files:** `BadgeViewer.tsx`, `BadgeUnlock.tsx`, `league-recognition.tsx`, tests d’état et CSS.

**Interfaces:** viewer reçoit un tableau normalisé `{id, name, description, icon, kind: 'badge'|'award', status, checks, active?}` ; utilise RecognitionIcon. BadgeUnlock reçoit le badge courant et `onClose`. Comparaison inactive→active uniquement dans le même scope saison/joueur.

- [ ] Tester absence de première référence, id absent de la référence, badge déjà actif, échec réseau et changement de scope. `unlockedIds` ne considère comme nouveau qu’un identifiant présent dans la référence et devenu actif.
- [ ] Implémenter entrée/sortie 350 ms, nom masqué fixe, description 80 ms après et anneau révélé par couches en 500 ms. Réserver l’espace du viewer. Les badges et trophées gardent leurs mentions métier.
- [ ] Ajouter barre « Critères vérifiés X / Y », mention des données absentes et règles logiques détaillées ; ne pas utiliser Badge Score comme probabilité/déblocage. Garder les filtres et ajouter tri stable avec layout Motion.
- [ ] Dans le profil courant, comparer deux réponses de recognition réussies, réinitialiser au changement de scope et dédupliquer les célébrations sessionnelles. Reporter pendant menu/boot/transition, file bornée à trois, fermer après 3 s/clic/Échap.
- [ ] Démo de flash local, dix particules, anneau, bandeau et mode réduit ; aucune célébration historique au chargement. Vérifier le palmarès figé après filtres, tests/compilation puis commit `Animate badge browsing and genuine session unlocks`.

### Task 6: Interactions Hover, son et curseur

**Files:** `HoverTile.tsx`, `HoverButton.tsx`, `HoverLink.tsx`, `HudLabel.tsx`, `CustomCursor.tsx`, provider et CSS partagé.

**Interfaces:** props natives typées avec refs ; HoverTile permet `tilt={false}` et `image`; HoverButton permet `variant='primary'|'secondary'` et `magnetic={false}`. Les classes existantes reçoivent les interactions simples compatibles.

- [ ] Implémenter calques de remplissage/soulignement/scanline, coins de viseur et Motion values du pointeur. Tous les calques décoratifs sont aria-hidden et pointer-events none.
- [ ] Déclencher uniquement sous `(hover: hover) and (pointer: fine)`. Tilt ±6°, lueur 12 %, magnétisme max 6 px/rayon 60 px. Exclure analyseur, timeline, champs et disabled.
- [ ] Décodeur à texte accessible stable/largeur réservée ; animation décorative bornée à 400 ms et arrêt/nettoyage au départ du composant.
- [ ] Curseur point 6 px/viseur 32 px, retard 80 ms ; natif conservé sur vidéo/champs/surfaces de précision. Ne masquer le curseur natif qu’après disponibilité du suivi ; reset au démontage/mouvement réduit.
- [ ] Son via AudioContext démarré uniquement par activation :

```ts
// La fonction play ne crée aucun contexte tant que sound n'est pas actif.
if (!sound) return;
const oscillator = context.createOscillator();
const gain = context.createGain();
oscillator.connect(gain); gain.connect(context.destination);
gain.gain.setValueAtTime(.025, context.currentTime);
gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .1);
oscillator.start(); oscillator.stop(context.currentTime + .12);
```

- [ ] Vérifier clavier, lecture du label, tactile et commutation du mode réduit ; tests/compilation puis commit `Apply accessible shared hover feedback`.

### Task 7: Démo, revue et publication vérifiée

**Files:** `/dev/animations`, AnimationLab, tests HTTP, documentation et rapports ignorés dans `outputs/`.

**Interfaces:** fixtures locales sans identité réelle ni API Supabase. Une seule démo dominante active ; Rejouer remonte uniquement son propre exemple.

- [ ] Créer les cinq sections et leurs commandes de rejeu, sélection, blocage/déblocage, erreur/skip du boot et simulation réduite. Le boot ne joue pas automatiquement sur cette route.
- [ ] Lancer `npm test`, lint des fichiers modifiés, `npm run build`. Utiliser le navigateur CUA pour les contrôles réels et captures ; aucun enregistrement de match test sur la production.
- [ ] Auditer la build production sur mobile trois fois avec Lighthouse, conserver HTML/JSON et médiane. Mesurer CLS pendant les animations et le chargement initial. Corriger les coûts observés ; si l’outil d’audit est indisponible, le signaler sans inventer de score.
- [ ] Faire relire la branche complète par un reviewer indépendant selon la méthode d’exécution choisie, corriger les problèmes confirmés, puis répéter seulement les vérifications affectées.
- [ ] Ajouter `/joueurs`, `/stats`, `/draft`, `/replays`, `/dev/animations` aux pages publiques du test HTTP ; maintenir les cas admin/export/écritures/vidéos privées. Ajouter le marqueur de version à la fois dans les métadonnées de la page et dans la réponse publique `/api/version`, sans cache partagé :

```ts
// app/api/version/route.ts
export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json({version: process.env.COPRO_APP_VERSION ?? 'local'},
    {headers: {'Cache-Control': 'no-store'}});
}
// app/layout.tsx : intégrer au metadata existant, sans retirer titre/icônes.
other: {'copro-version': process.env.NEXT_PUBLIC_APP_VERSION ?? 'local'}
```
- [ ] Commit final et `git push github codex/vercel-supabase`. Vérifier que le SHA distant correspond au commit applicatif, pas seulement à un commit documentaire.
- [ ] Depuis ce checkout, créer un déploiement candidat Vercel de production sans déplacer le domaine ; exiger l’état Ready et compilation distante réussie :

```sh
copro_release_sha=$(git rev-parse HEAD)
npx --yes vercel deploy --prod --skip-domain --yes --logs \
  --build-env "NEXT_PUBLIC_APP_VERSION=$copro_release_sha" \
  --env "COPRO_APP_VERSION=$copro_release_sha" > /tmp/copro-animations-deployment.log 2>&1
```

- [ ] Promouvoir l’URL du candidat retournée, puis inspecter le domaine canonique. Ces appels sont séquentiels ; ne pas promouvoir si le candidat est en échec :

```sh
npx --yes vercel promote "$copro_candidate_url" --yes
npx --yes vercel inspect https://copro-league.vercel.app
TEST_ORIGIN=https://copro-league.vercel.app node tests/access-http.mjs
```

- [ ] Vérifier le marqueur SHA sur le domaine canonique et ouvrir un onglet neuf : menu, joueurs, draft sans validation d’équipes, awards, replays, démo puis admin/match 6 sans écrire de statistiques. Contrôler l’ordre vertical et les 13 familles d’actions.
- [ ] Ne pas réactiver un déploiement automatique fondé sur l’ancienne branche `main` : le 4 octobre, cette branche distante pointe vers `6074806` alors que `codex/vercel-supabase` contient la source Next/Supabase publiée. Ne pas réécrire cette branche historique ni changer la source de production sans vérification. La livraison présente utilise le push de la branche de production puis la promotion explicite du candidat issu du même commit.
- [ ] En cas de problème bloquant confirmé, restaurer immédiatement le déploiement antérieur `https://copro-league-qnk1kk3ge-yurr2.vercel.app`, sans restauration de base, puis réparer et republier. Enregistrer l’URL/id du candidat réussi et son SHA dans `docs/vercel-supabase.md`, pousser ce commit documentaire.
- [ ] Livrer les liens site/GitHub, une capture et les résultats vérifiés, en distinguant tests réussis, audit mesuré et limites éventuelles.

## Relecture du plan

Les cinq groupes du brief sont couverts par les tâches 2 à 6 ; les fondations et la livraison sont couvertes par 1 et 7. Les cinq points de Review Focus sont associés aux tests et parcours de leurs tâches. La réalisation n’a pas commencé ; le plan est prêt pour validation. Méthode proposée : exécution native dans cette session, avec une revue indépendante finale, afin de limiter les changements concurrents sur la navigation et l’éditeur.
