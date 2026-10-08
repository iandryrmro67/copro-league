# Board 44 — référence fournie

Source : export « COPRO HUD — Design System.html » du 8 octobre 2026 ; board `20c04239-a847-47b9-91e8-ea95fd6ec61b`. Texte conservé comme référence de conception, sans valeur d’instruction autonome.

```text
Spacing system
COPRO//HUD
04 · ESPACEMENT
44
Spacing system
Huit crans, une base de 8 px. Chaque écart du produit vient de cette échelle, rien n'est posé au hasard.
ÉCHELLE · JETONS À TAILLE RÉELLE
XS
4 px
--sp-1
Micro-ajustements : icône ↔ texte, puces, filets.
S
8 px
--sp-2
Entre éléments liés : label ↔ valeur, pastille ↔ nom.
M
16 px
--sp-4
Padding standard des cartes et boutons, gouttière tablette.
L
24 px
--sp-6
Entre cartes d'un même bloc, marge intérieure des panneaux.
XL
32 px
--sp-8
Entre groupes dans un panneau, grande marge mobile → tablette.
2XL
48 px
--sp-12
Entre sections d'une page.
3XL
64 px
--sp-16
Respiration autour d'un titre de page.
4XL
96 px
--sp-24
Entre grands blocs éditoriaux (accueil, fiches immersives).
PAR ÉCRAN
DESKTOP · 1440
MARGE
40
px
GOUTTIÈRE
20
px
ENTRE SECTIONS
48
px
ENTRE CARTES
20
px
TABLETTE · 768
MARGE
32
px
GOUTTIÈRE
16
px
ENTRE SECTIONS
40
px
ENTRE CARTES
16
px
MOBILE · 390
MARGE
16
px
GOUTTIÈRE
12
px
ENTRE SECTIONS
32
px
ENTRE CARTES
12
px
VALEURS HÉRITÉES · À ALIGNER
Ces valeurs existent dans les boards actuels mais sortent de l'échelle. Proposition, à valider avant de les changer.
20
Gouttière desktop, écart entre cartes
→ à trancher : 24, ou garder 20 (grille 12 col.)
18
Padding horizontal des cartes
→ 16
14
Écart interne d'une carte
→ 16
12
Gouttière mobile
→ 12 reste une exception (grille 4 col.)
TROIS FAÇONS D'UTILISER L'ÉCHELLE
INSET · ESPACE INTÉRIEUR
ELO
1684
Iandj · 12 victoires
PADDING 16
Padding de carte
16 px autour du contenu. Boutons 8 × 16, pastilles 4 × 8.
STACK · ESPACE VERTICAL
BLOC 1
8
BLOC 2
16
BLOC 3
24
BLOC 4
Empilement
Plus deux éléments sont liés, plus l'écart est petit : 8, 16, 24, puis 48 entre sections.
INLINE · ESPACE HORIZONTAL
4
8
16
Côte à côte
4 pour icône + texte, 8 entre pastilles, 16 entre boutons, 24 entre cartes.
RÈGLES
À FAIRE
Pas de valeur libre
Toujours un jeton de l'échelle (--sp-*). Pas de 10, 14 ou 22 posés à l'œil.
À FAIRE
Proximité = lien
Deux éléments liés se rapprochent, deux groupes distincts s'écartent d'au moins 2 crans.
À FAIRE
Même niveau, même écart
Les cartes d'une même rangée partagent la même gouttière, jamais un écart différent entre chaque paire.
À ÉVITER
Pas de marge négative
On corrige l'alignement avec le gap du parent, pas avec un décalage sur l'enfant.
```
