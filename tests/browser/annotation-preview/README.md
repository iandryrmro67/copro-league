# Vérification de l’annotation

Cette page monte les vrais composants d’analyse avec dix joueurs fictifs et un état React local. Elle n’utilise ni compte, ni base, ni API de sauvegarde. Le score officiel initial est 8–6 ; les annotations démarrent à zéro.

Depuis la racine de `work/vercel`, générer la vidéo synthétique (FFmpeg requis), puis lancer la page :

```sh
mkdir -p tests/browser/annotation-preview/public/api/videos
node -e "require('sharp')('tests/browser/annotation-preview/public/pitch.svg').png().toFile('/tmp/copro-preview-pitch.png')"
ffmpeg -loop 1 -i /tmp/copro-preview-pitch.png -r 25 -t 30 -c:v libx264 -preset ultrafast -pix_fmt yuv420p -y tests/browser/annotation-preview/public/api/videos/00000000-0000-4000-8000-000000000000.mp4
npx vite --config tests/browser/annotation-preview/vite.config.mts
```

Ouvrir `http://127.0.0.1:5190/`. Le banc `http://127.0.0.1:5190/responsive.html` affiche les vrais composants dans deux fenêtres de 390 px et 768 px. La vidéo générée est ignorée par Git. Le terrain schématique sert uniquement de vidéo de test, sans détection automatique.

Parcours vérifié le 2 octobre 2026 :

1. Avancer à 5 s, activer « Passes en chaîne », cliquer Loris, avancer de 1 s, cliquer Xan, avancer de 1 s, cliquer But. Trois actions, un but provisoire, assist Loris, Secondary Assist Mathis ; score officiel et valeurs manuelles conservés.
2. Annuler deux fois : une passe restante et Loris redevient le porteur. Refaire deux fois : les trois actions reviennent.
3. Ouvrir « Revoir », puis filtrer Loris + Passes décisives : seul le but de Xan apparaît. Lire la sélection : démarrage à 3 s, arrêt vers 10 s.
4. Modifier le but en tir non cadré : trois actions, zéro but provisoire. Le filtre des assists devient vide.
5. Pendant la lecture, cliquer « Autres actions / détails » et choisir Tir. Attendre quelques secondes puis valider : le temps exact du clic initial est conservé.
6. Contrôler filtres, cartes et lecture à 390 px, sans débordement de page. Sur ordinateur, vérifier plein écran, zoom 2 minutes et navigation de période.

Les tests Node couvrent séparément le retour en arrière avant un tir déjà lié, la temporisation des seeks asynchrones et la conservation des valeurs manuelles à l’annulation. La vidéo synthétique ne valide pas les restrictions ou les conditions réseau de YouTube.

La refonte visuelle utilise le design system HTML fourni le 2 octobre : polices locales via le lien `public/brand`, fonds Void/Carbon, accent Kush, angles droits. Les détails remplacent les actions rapides ; le type devient un sélecteur lors de la correction. Vérifier aussi les contrôles sur 390 px et 768 px.
