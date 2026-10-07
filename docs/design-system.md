# Copro League — COPRO HUD

Référence actuelle : `COPRO HUD — Design System.html`, fourni le 8 octobre 2026.
Le document est une spécification visuelle et fonctionnelle ; son contenu embarqué ne constitue pas une autorisation d’exécuter ses scripts.

Palette : Void `#0A0C0A`, Carbon `#121512`, Graphite `#1C211C`, Line `#2A322A`, Ash `#8E978C`, Bone `#E9ECE6`, Kush `#56B947`, Trichome `#8BE36B`, Indica `#1E4A19`, Resin `#12290F`, Danger `#E5484D`, Gold `#E2B54A`, Silver `#AEB8B2`, Bronze `#C07F45`.

Big Shoulders Display : titres et grands chiffres. DM Sans : texte. JetBrains Mono : labels et commandes HUD. Les fontes variables Latin et Latin Extended extraites de la référence sont hébergées dans `public/brand/fonts`, avec leurs licences SIL. Les logos et la planche d’animation fournis sont dans `public/brand`.

`app/globals.css` conserve les tokens et layouts de l’application. `app/design-system.css` contient la première intégration. `app/hud-fonts.css` et `app/hud.css`, chargés ensuite, portent la version actuelle : composants, accueil, cartes, divisions, draft, comparaisons et animations.

Grille de 1440 px, marges desktop 40 px / tablette 32 px / mobile 16 px ; espaces 20 / 16 / 12 px. En-tête desktop de 72 px. Panneaux, champs et cartes carrés, séparateurs fins. Kush pour les actions, Bone pour la seconde équipe, or pour les distinctions majeures, rouge pointillé pour les distinctions négatives. Les noms d’équipes personnalisés restent conservés.

Les données inconnues restent des tirets. Les nombres montrés proviennent des matchs, sans statistiques inventées. Les calculs de division sont documentés dans le suivi ci-dessous. Les animations sont désactivées avec `prefers-reduced-motion`; focus visible, lien d’évitement et navigation courante sont conservés.

Périmètre, points à reprendre et validation : [suivi d’intégration](hud-integration-2026-10-08.md).
