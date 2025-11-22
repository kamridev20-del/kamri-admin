// ============================================================
// FICHIER: src/utils/test-cj-auth.ts
// ============================================================
// Utilitaires pour tester l'authentification CJ Dropshipping

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Fonction de debug pour l'authentification CJ
 * Affiche des informations de diagnostic dans la console
 */
export function debugAuth() {
  console.log('🔍 DIAGNOSTIC AUTHENTIFICATION CJ DROPSHIPPING');
  console.log('================================================\n');

  // Vérifier le token
  const token = localStorage.getItem('token');
  console.log('1️⃣ Token d\'authentification:');
  console.log('   - Présent:', token ? '✅ Oui' : '❌ Non');
  if (token) {
    console.log('   - Token (premiers 20 caractères):', token.substring(0, 20) + '...');
  }

  // Vérifier l'URL de l'API
  console.log('\n2️⃣ Configuration API:');
  console.log('   - API URL:', API_URL);

  // Vérifier la configuration CJ
  console.log('\n3️⃣ Configuration CJ Dropshipping:');
  const cjConfig = localStorage.getItem('cj-config');
  if (cjConfig) {
    try {
      const config = JSON.parse(cjConfig);
      console.log('   - Email:', config.email || 'Non défini');
      console.log('   - Tier:', config.tier || 'Non défini');
      console.log('   - Enabled:', config.enabled ? '✅ Oui' : '❌ Non');
    } catch (e) {
      console.log('   - Config invalide dans localStorage');
    }
  } else {
    console.log('   - Aucune config trouvée dans localStorage');
  }

  console.log('\n================================================');
}

/**
 * Teste l'authentification CJ Dropshipping
 * @returns true si l'authentification est OK, false sinon
 */
export async function testCJAuthentication(): Promise<boolean> {
  console.log('🔐 TEST D\'AUTHENTIFICATION CJ DROPSHIPPING...');

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ Aucun token d\'authentification trouvé');
      return false;
    }

    // Tester l'endpoint de configuration CJ
    const response = await fetch(`${API_URL}/cj-dropshipping/config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Authentification CJ OK !');
      console.log('   - Config trouvée:', data.email ? '✅ Oui' : '❌ Non');
      return true;
    } else {
      const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
      console.error('❌ Erreur d\'authentification:', error.message || response.statusText);
      console.error('   - Status:', response.status);
      return false;
    }
  } catch (error: any) {
    console.error('❌ Erreur lors du test d\'authentification:', error.message);
    return false;
  }
}


