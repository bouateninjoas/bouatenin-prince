# Spécification — Todo

## Objectif

Fournir une liste de tâches personnelle, rapide et lisible pour aider une personne à organiser les actions de sa journée.

## Utilisateurs et plateforme

- Toute personne souhaitant gérer simplement ses tâches quotidiennes.
- Application web statique adaptée aux écrans mobiles et de bureau.
- Navigateur récent ; aucune inscription, API ou installation requise.

## Fonctionnalités requises

1. Ajouter une tâche non vide (120 caractères maximum).
2. Marquer une tâche comme terminée ou à faire.
3. Supprimer une tâche individuelle ou effacer toutes les tâches terminées.
4. Filtrer la liste : toutes, à faire, terminées.
5. Afficher le nombre de tâches et la progression des tâches terminées.
6. Persister les tâches dans `localStorage` entre les visites sur le même navigateur.

## Contraintes et qualité

- Les données restent dans le navigateur : aucun compte ni transfert vers un serveur.
- Interface en français, responsive, utilisable au clavier et annoncée aux technologies d’assistance.
- Les noms de tâches sont affichés comme texte, sans interpréter de contenu HTML.
- Aucun framework ni dépendance d’exécution ; déploiement statique sur GitHub Pages.

## Hors périmètre

Comptes utilisateurs, synchronisation entre appareils, collaboration, rappels, dates d’échéance et accès hors ligne garanti.
