// ============================================================
// FICHIER: apps/admin/src/utils/debug-auth.ts
// ============================================================
// Script de diagnostic complet pour l'authentification admin

export function debugAdminAuth() {
  console.log('🔍 DIAGNOSTIC COMPLET DE L\'AUTHENTIFICATION ADMIN');
  console.log('================================================\n');

  // 1. Vérifier l'URL actuelle
  console.log('1️⃣ URL actuelle:', window.location.href);
  
  // 2. Vérifier localStorage
  console.log('\n2️⃣ Contenu de localStorage:');
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const authData = localStorage.getItem('authData');
  
  console.log('   - Token:', token ? `${token.substring(0, 20)}...` : '❌ Aucun');
  console.log('   - User:', user ? JSON.parse(user) : '❌ Aucun');
  console.log('   - AuthData:', authData ? JSON.parse(authData) : '❌ Aucun');
  
  // 3. Vérifier sessionStorage
  console.log('\n3️⃣ Contenu de sessionStorage:');
  const sessionToken = sessionStorage.getItem('token');
  const sessionUser = sessionStorage.getItem('user');
  
  console.log('   - Session Token:', sessionToken ? `${sessionToken.substring(0, 20)}...` : '❌ Aucun');
  console.log('   - Session User:', sessionUser ? JSON.parse(sessionUser) : '❌ Aucun');
  
  // 4. Vérifier les cookies
  console.log('\n4️⃣ Cookies:');
  console.log('   - Document cookies:', document.cookie);
  
  // 5. Vérifier si on est sur la page de login
  const isOnLoginPage = window.location.pathname.includes('/login');
  console.log('\n5️⃣ Page actuelle:');
  console.log('   - Sur page de login:', isOnLoginPage ? '✅ Oui' : '❌ Non');
  console.log('   - Path:', window.location.pathname);
  
  // 6. Test de connexion directe
  console.log('\n6️⃣ Test de connexion directe:');
  if (token) {
    console.log('   - Token présent, test de validité...');
    // Tester le token avec une requête simple
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => {
      if (response.ok) {
        console.log('   ✅ Token valide !');
      } else {
        console.log('   ❌ Token invalide (status:', response.status, ')');
      }
    })
    .catch(error => {
      console.log('   ❌ Erreur lors du test:', error.message);
    });
  } else {
    console.log('   ❌ Pas de token à tester');
  }
  
  // 7. Recommandations
  console.log('\n================================================');
  console.log('💡 RECOMMANDATIONS:');
  console.log('================================================\n');
  
  if (!token && !isOnLoginPage) {
    console.log('❌ PROBLÈME: Pas de token ET pas sur la page de login');
    console.log('   → Redirection vers la page de login nécessaire');
    console.log('   → Vérifier que l\'authentification fonctionne\n');
  }
  
  if (isOnLoginPage) {
    console.log('ℹ️  Vous êtes sur la page de login');
    console.log('   → Connectez-vous avec admin@kamri.com / password');
    console.log('   → Vérifiez que la connexion fonctionne\n');
  }
  
  if (token) {
    console.log('✅ Token trouvé');
    console.log('   → Vérifiez que le token n\'est pas expiré');
    console.log('   → Testez une requête API pour valider\n');
  }
  
  console.log('🔧 ACTIONS À FAIRE:');
  console.log('   1. Aller sur http://localhost:3002/admin/login');
  console.log('   2. Se connecter avec admin@kamri.com / password');
  console.log('   3. Vérifier que vous êtes redirigé vers /admin/dashboard');
  console.log('   4. Vérifier que le token est stocké dans localStorage');
  console.log('   5. Revenir sur /admin/cj-dropshipping/config\n');
}

// Fonction pour forcer la déconnexion et reconnexion
export function forceReconnect() {
  console.log('🔄 FORÇAGE DE LA RECONNEXION...');
  
  // Nettoyer tout le stockage
  localStorage.clear();
  sessionStorage.clear();
  
  // Supprimer les cookies
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  console.log('✅ Stockage nettoyé');
  console.log('→ Redirection vers la page de login...');
  
  // Rediriger vers la page de login
  window.location.href = '/admin/login';
}

// Fonction pour tester la connexion avec des credentials
export async function testLogin(email: string, password: string) {
  console.log('🔐 TEST DE CONNEXION AVEC CREDENTIALS...');
  console.log('📧 Email:', email);
  console.log('🔑 Password (ignoré par le backend):', password);
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }) // Seul l'email est nécessaire
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Connexion réussie !');
      console.log('   - Token:', data.token ? `${data.token.substring(0, 20)}...` : 'Aucun');
      console.log('   - User:', data.user);
      
      // Stocker le token
      if (data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        console.log('✅ Token stocké dans localStorage');
      }
      
      return true;
    } else {
      console.log('❌ Connexion échouée:', data.message);
      return false;
    }
  } catch (error: any) {
    console.log('❌ Erreur lors de la connexion:', error.message);
    return false;
  }
}
