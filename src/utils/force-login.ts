// ============================================================
// FICHIER: apps/admin/src/utils/force-login.ts
// ============================================================
// Script pour forcer la déconnexion et reconnexion

export function forceLogout() {
  console.log('🚪 FORÇAGE DE LA DÉCONNEXION...');
  
  // Nettoyer tout le stockage
  localStorage.clear();
  sessionStorage.clear();
  
  // Supprimer tous les cookies
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  console.log('✅ Stockage nettoyé');
  
  // Rediriger vers la page de login
  window.location.href = '/admin/login';
}

export function checkAuthStatus() {
  console.log('🔍 VÉRIFICATION DU STATUT D\'AUTHENTIFICATION');
  console.log('==============================================\n');
  
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  const currentPath = window.location.pathname;
  
  console.log('📍 URL actuelle:', currentPath);
  console.log('🔑 Token présent:', !!token);
  console.log('👤 User présent:', !!user);
  
  if (token) {
    console.log('✅ Token trouvé:', token.substring(0, 20) + '...');
  } else {
    console.log('❌ Aucun token trouvé');
  }
  
  if (user) {
    try {
      const userData = JSON.parse(user);
      console.log('✅ User trouvé:', userData.email || 'Email non trouvé');
    } catch (e) {
      console.log('❌ User data invalide');
    }
  } else {
    console.log('❌ Aucun user trouvé');
  }
  
  // Vérifier si on devrait être sur la page de login
  const shouldBeOnLogin = !token || !user;
  const isOnLoginPage = currentPath.includes('/login');
  
  console.log('\n📊 ANALYSE:');
  console.log('   - Devrait être sur login:', shouldBeOnLogin);
  console.log('   - Est sur login:', isOnLoginPage);
  
  if (shouldBeOnLogin && !isOnLoginPage) {
    console.log('\n⚠️  PROBLÈME: Pas de token mais pas sur la page de login');
    console.log('   → Redirection vers /admin/login nécessaire');
    return 'redirect_to_login';
  }
  
  if (!shouldBeOnLogin && isOnLoginPage) {
    console.log('\n✅ OK: Token présent, redirection vers dashboard');
    return 'redirect_to_dashboard';
  }
  
  if (shouldBeOnLogin && isOnLoginPage) {
    console.log('\n✅ OK: Pas de token, sur la page de login');
    return 'on_login_page';
  }
  
  console.log('\n✅ OK: Token présent, sur une page protégée');
  return 'authenticated';
}

// Fonction pour tester la connexion avec des credentials
export async function testDirectLogin(email: string = 'admin@kamri.com', password: string = 'admin123') {
  console.log('🔐 TEST DE CONNEXION DIRECTE...');
  console.log('📧 Email:', email);
  console.log('🔑 Password:', password);
  
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }) // Email ET password pour admin
    });
    
    const data = await response.json();
    
    console.log('📡 Réponse du serveur:');
    console.log('   - Status:', response.status);
    console.log('   - Data:', data);
    
    if (response.ok && data.token) {
      console.log('✅ Connexion réussie !');
      
      // Stocker le token
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      console.log('✅ Token stocké dans localStorage');
      console.log('✅ Redirection vers le dashboard...');
      
      // Rediriger vers le dashboard
      window.location.href = '/admin/dashboard';
      
      return true;
    } else {
      console.log('❌ Connexion échouée:', data.message || 'Erreur inconnue');
      return false;
    }
  } catch (error: any) {
    console.log('❌ Erreur lors de la connexion:', error.message);
    return false;
  }
}

// Fonction pour vérifier si le serveur backend fonctionne
export async function checkBackendHealth() {
  console.log('🏥 VÉRIFICATION DE LA SANTÉ DU BACKEND...');
  
  try {
    const response = await fetch('http://localhost:3001/api/health', {
      method: 'GET',
    });
    
    if (response.ok) {
      console.log('✅ Backend accessible');
      return true;
    } else {
      console.log('❌ Backend inaccessible (status:', response.status, ')');
      return false;
    }
  } catch (error: any) {
    console.log('❌ Backend inaccessible:', error.message);
    return false;
  }
}
