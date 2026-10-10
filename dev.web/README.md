# Mon espace privé

Cette application sert le contenu de l’espace uniquement après authentification côté serveur. Elle utilise Node.js 18 ou supérieur, sans dépendance à installer.
Ne déployez pas ce dossier comme un site statique et n’ouvrez pas `index.html` directement : la protection est appliquée par `server.js`.

## Démarrer en local

Dans PowerShell, depuis ce dossier, choisissez le nom de connexion et un mot de passe personnel d'au moins 12 caractères :

```powershell
$env:SITE_USER = Read-Host "Nom d'utilisateur"
$secret = Read-Host "Choisissez un mot de passe d'au moins 12 caractères" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $env:SITE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
npm start
```

Ouvrez ensuite `http://localhost:3000` et utilisez ces mêmes identifiants. `SITE_USER` et `SITE_PASSWORD` sont obligatoires et n'ont pas de valeur par défaut. Configurez-les comme variables secrètes d'environnement sur l'hébergeur, jamais dans le code ou dans le dépôt. Le nom doit correspondre exactement à la valeur de `SITE_USER`.

En production, utilisez HTTPS et définissez `NODE_ENV=production` pour activer l'attribut `Secure` du cookie. Les sessions expirent après 12 heures et sont conservées en mémoire : redémarrer le serveur déconnecte les visiteurs. Le contenu protégé est dans `site.html`.
