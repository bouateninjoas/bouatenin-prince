# Todo

Une petite application de liste de tâches, en français, pensée pour organiser sa journée sans distraction. L’interface est volontairement simple et les tâches sont sauvegardées dans le navigateur.

## Utiliser l’application

Ouvrez `index.html` dans un navigateur récent ou lancez un serveur statique depuis ce dossier. Aucune installation ni dépendance n’est nécessaire. Les tâches sont conservées sur l’appareil avec `localStorage` ; elles ne sont ni envoyées à un serveur ni synchronisées entre appareils.

## Fonctionnalités

- Ajouter, terminer, réactiver et supprimer des tâches.
- Filtrer la liste par tâches à faire ou terminées.
- Afficher le nombre de tâches et la progression.
- Effacer les tâches terminées en une action.
- Utiliser une interface responsive, clavier et lecteur d’écran.

## Fichiers

- `index.html` — structure et contenu de l’application.
- `style.css` — styles responsives et accessibles.
- `script.js` — interactions et sauvegarde locale.
- `SPECIFICATION.md` — courte spécification du projet.

## Déploiement

Le workflow GitHub Actions à la racine du dépôt publie ce dossier sur GitHub Pages à chaque mise à jour de la branche `main`. Dans les paramètres du dépôt, sélectionnez **Settings → Pages → Build and deployment → GitHub Actions** si Pages n’est pas encore configuré.
