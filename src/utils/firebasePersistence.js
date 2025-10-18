/**
 * Utilitário para forçar persistência de dados do Firebase
 * Substitui efetivamente o cache local pelos dados mais recentes do Firebase
 */

class FirebasePersistence {
  constructor() {
    this.cacheBustingParams = {
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(7),
      version: '1.0.0'
    };
  }

  /**
   * Limpa completamente todos os caches locais
   */
  clearAllLocalCache() {
    try {
      // Limpar localStorage
      localStorage.clear();
      
      // Limpar sessionStorage
      sessionStorage.clear();
      
      // Limpar IndexedDB
      if ('indexedDB' in window) {
        indexedDB.databases().then(databases => {
          databases.forEach(db => {
            indexedDB.deleteDatabase(db.name);
          });
        }).catch(err => {
          console.warn('Erro ao limpar IndexedDB:', err);
        });
      }
      
      // Limpar cache do navegador (se suportado)
      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            caches.delete(cacheName);
          });
        }).catch(err => {
          console.warn('Erro ao limpar cache do navegador:', err);
        });
      }
      
      console.log('🧹 Cache local completamente limpo');
    } catch (error) {
      console.warn('Erro ao limpar cache local:', error);
    }
  }

  /**
   * Gera parâmetros de cache-busting únicos
   */
  generateCacheBustingParams() {
    return {
      t: Date.now(),
      r: Math.random().toString(36).substring(7),
      v: '1.0.0',
      mobile: this.isMobile() ? '1' : '0',
      force: '1'
    };
  }

  /**
   * Detecta se é dispositivo móvel
   */
  isMobile() {
    return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Adiciona headers para forçar dados frescos do Firebase
   */
  getFreshDataHeaders() {
    return {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Cache-Bust': Date.now().toString(),
      'X-Force-Refresh': 'true'
    };
  }

  /**
   * Força refresh completo da página com limpeza de cache
   */
  forcePageRefresh() {
    console.log('🔄 Forçando refresh completo da página...');
    
    // Limpar cache primeiro
    this.clearAllLocalCache();
    
    // Refresh forçado
    setTimeout(() => {
      window.location.reload(true);
    }, 100);
  }

  /**
   * Força dados do Firebase substituindo cache local
   */
  async forceFirebaseData(url, options = {}) {
    const cacheBustingParams = this.generateCacheBustingParams();
    const queryString = new URLSearchParams(cacheBustingParams).toString();
    
    // Verificar se a URL já tem parâmetros de query
    const separator = url.includes('?') ? '&' : '?';
    const freshUrl = `${url}${separator}${queryString}`;
    
    const freshOptions = {
      ...options,
      headers: {
        ...options.headers,
        ...this.getFreshDataHeaders()
      }
    };

    console.log('🔥 Forçando dados do Firebase:', freshUrl);
    
    try {
      const response = await fetch(freshUrl, freshOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Dados frescos do Firebase obtidos:', data);
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao obter dados frescos do Firebase:', error);
      throw error;
    }
  }

  /**
   * Força sincronização completa com Firebase
   */
  async forceSyncWithFirebase() {
    console.log('🔄 Iniciando sincronização forçada com Firebase...');
    
    // Limpar cache local primeiro
    this.clearAllLocalCache();
    
    // Se for mobile, forçar refresh da página
    if (this.isMobile()) {
      console.log('📱 Mobile detectado - Forçando refresh da página');
      this.forcePageRefresh();
      return true;
    }
    
    return false;
  }
}

// Instância singleton
const firebasePersistence = new FirebasePersistence();

export default firebasePersistence;
