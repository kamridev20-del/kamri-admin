import { API_BASE_URL } from './constants';

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function apiClient<T>(
  endpoint: string,
  { token, headers, ...customConfig }: RequestOptions = {}
): Promise<T> {
  const config: RequestInit = {
    method: customConfig.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...customConfig,
  };

  if (token) {
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    console.log('🔑 [apiClient] Token fourni directement');
  } else {
    // Si aucun token n'est fourni, essayez de le récupérer du localStorage
    // Chercher dans 'token' OU 'auth_token' pour compatibilité
    const storedToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
    if (storedToken) {
      (config.headers as Record<string, string>).Authorization = `Bearer ${storedToken}`;
      console.log('🔑 [apiClient] Token récupéré du localStorage:', storedToken.substring(0, 20) + '...');
    } else {
      console.warn('⚠️ [apiClient] Aucun token trouvé dans localStorage');
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;
  
  // Log pour déboguer
  const authHeader = (config.headers as Record<string, string>).Authorization;
  console.log(`🌐 [apiClient] ${customConfig.method || 'GET'} ${url}`);
  console.log(`🔑 [apiClient] Authorization header:`, authHeader ? authHeader.substring(0, 30) + '...' : 'AUCUN');

  let data;
  try {
    const response = await fetch(url, config);
    data = await response.json();

    console.log(`📡 [apiClient] Réponse ${response.status} pour ${endpoint}`);

    if (response.ok) {
      return data;
    }
    
    // Gérer les erreurs HTTP (ex: 401, 404, 500)
    if (response.status === 401) {
      console.error(`❌ [apiClient] 401 Unauthorized pour ${endpoint}`);
      console.error(`❌ [apiClient] Token utilisé:`, authHeader ? 'OUI' : 'NON');
      console.error(`❌ [apiClient] Réponse serveur:`, data);
    }
    
    const error = new Error(data?.message || response.statusText);
    (error as any).status = response.status;
    (error as any).data = data;
    return Promise.reject(error);
  } catch (error) {
    // Gérer les erreurs réseau ou autres
    console.error('❌ [apiClient] Erreur réseau:', error);
    return Promise.reject(error);
  }
}
