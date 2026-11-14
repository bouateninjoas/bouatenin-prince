# MarketCI

Marketplace généraliste de démonstration : catalogue piloté par Flask/SQLite, pages d’information et formulaire de contact relié à la base de données.

## Démarrer en local (Windows)

Depuis le dossier `projet final` :

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:MARKETCI_SECRET_KEY = (& python -c "import secrets; print(secrets.token_urlsafe(32))").Trim()
python app.py
```

Ouvre ensuite [http://127.0.0.1:5000](http://127.0.0.1:5000). Les tables et les 20 catégories d’exemple sont créées au premier lancement. Pour créer ton compte, visite `/admin` et choisis ton propre identifiant et un mot de passe d’au moins 12 caractères. L’inscription initiale n’est possible qu’une seule fois. Le mot de passe est stocké sous forme hachée dans la base.

Ne partage pas ton mot de passe et ne le mets pas dans Git. Choisis un mot de passe unique et solide.

La base SQLite est créée dans `instance/marketci.sqlite3`. Pour déplacer la base, configurez `MARKETCI_DATABASE` avec un chemin de fichier accessible en écriture.

## Déploiement

En production, définissez `MARKETCI_ENV=production` et une `MARKETCI_SECRET_KEY` aléatoire d’au moins 32 caractères. Configurez un compte administrateur via les variables d’environnement (`MARKETCI_ADMIN_USERNAME`, `MARKETCI_ADMIN_PASSWORD`, 16 caractères minimum) ou crée-le une seule fois après le démarrage du site. Utilise HTTPS et un stockage persistant pour le fichier SQLite ; les disques éphémères peuvent effacer la base lors d’un redémarrage. Pour le serveur WSGI installé avec les dépendances :

```sh
gunicorn --workers 1 --bind 0.0.0.0:$PORT app:app
```

Sauvegardez la base et définissez une politique de confidentialité et de conservation des demandes avant d’utiliser les formulaires avec de vrais clients.

## Administration

Connectez-vous sur `/admin` pour :

- créer, modifier et supprimer des catégories ;
- créer, modifier et supprimer des produits du catalogue ;
- lire les demandes d’information, les contacts et les demandes de vendeurs.

Les demandes des formulaires sont persistées dans SQLite. Le serveur applique une validation côté serveur, une limite de taille, une limite de fréquence pour les formulaires publics, une protection anti-spam simple, des jetons CSRF sur les formulaires d’administration et un verrouillage temporaire après plusieurs connexions échouées. Les mots de passe et clés sont fournis par variables d’environnement et ne sont pas enregistrés dans le dépôt.

## API

- `GET /api/health` — état du serveur.
- `GET /api/categories` — catégories actives.
- `GET /api/products?q=...&category=...&sort=featured|price-asc|price-desc` — catalogue filtrable.
- `POST /api/inquiries` — enregistrer un contact, une demande d’information ou une demande vendeur (`kind`, `name`, `email`, `subject`, `message` en JSON).

## Tests

```powershell
python -m unittest discover -s tests -v
```

Les exemples du catalogue, les notes et les avis sont des données de démonstration. La version actuelle ne crée pas de comptes clients, ne persiste pas les paniers et ne prend pas de commandes ni de paiements. SQLite est adapté au démarrage local ; avant un déploiement multi-instance ou une collecte de demandes en production, prévoir un stockage persistant et valider le choix de la base et de la sauvegarde.
