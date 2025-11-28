# Configuration Vercel pour kamri-admin

## Variables d'environnement requises

Dans l'interface Vercel pour votre projet `kamri-admin`, allez dans **Settings → Environment Variables** et ajoutez :

### Variable obligatoire :

- **Nom** : `NEXT_PUBLIC_API_URL`
- **Valeur** : `https://kamri-server-production.up.railway.app/api`
  (Remplacez par votre URL Railway réelle)
- **Environnements** : Production, Preview, Development

⚠️ **IMPORTANT** : 
- L'URL doit se terminer par `/api`
- Ne pas mettre de `/` à la fin après `/api`
- Ne pas utiliser de secret, mettre la valeur directement

## Configuration Railway pour CORS

Dans votre projet Railway pour `kamri-server`, allez dans **Variables** et ajoutez :

### Variables requises :

1. **ADMIN_URL** = `https://votre-admin.vercel.app`
   (L'URL de votre déploiement Vercel pour kamri-admin)

2. **FRONTEND_URL** = `https://kamri-web-bfcq.vercel.app`
   (L'URL de votre déploiement Vercel pour kamri-web)

3. **ALLOWED_ORIGINS** (optionnel) = `https://admin1.vercel.app,https://admin2.vercel.app`
   (Si vous avez plusieurs URLs admin, séparez-les par des virgules)

## Vérification

Après avoir configuré les variables :

1. **Redéployez** le projet admin sur Vercel
2. **Redéployez** le serveur sur Railway
3. Vérifiez que vous pouvez vous connecter avec `admin@kamri.com`

## Dépannage

Si vous avez toujours des erreurs CORS :

1. Vérifiez que `NEXT_PUBLIC_API_URL` est bien défini dans Vercel
2. Vérifiez que `ADMIN_URL` est bien défini dans Railway
3. Vérifiez que les URLs n'ont pas de `/` à la fin
4. Vérifiez que `NODE_ENV=production` est défini dans Railway





