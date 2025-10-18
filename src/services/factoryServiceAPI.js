import { apiFetch } from '../utils/apiUtils';

class FactoryServiceAPI {
  constructor() {
    // Detectar se está rodando no Vercel ou localmente
    this.isVercel = typeof window !== 'undefined' && 
      (window.location.protocol === 'https:' || 
       window.location.hostname.includes('vercel.app') || 
       window.location.hostname.includes('vercel.com') ||
       window.location.hostname.includes('gpreto.space') ||
       window.location.hostname !== 'localhost');
    
    // URL base da API
    this.apiUrl = this.isVercel 
      ? '/api'  // Vercel Functions
      : 'http://localhost:3001/api';  // Servidor local
  }

  async createFactory(factoryData) {
    try {
      const response = await fetch(`${this.apiUrl}/firestore/create/factories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(factoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar fábrica');
      }

      const result = await response.json();
      const newFactory = { id: result.id, ...factoryData };
      
      // Limpar cache agressivamente após criação
      await this.clearAllFactoryCache();
      
      // Disparar evento customizado para notificar componentes
      window.dispatchEvent(new CustomEvent('factoryCreated', { 
        detail: { factoryId: result.id } 
      }));
      
      console.log('Cache limpo e evento disparado após criação da fábrica');
      
      return newFactory;
    } catch (error) {
      console.error('Erro ao criar fábrica:', error);
      throw error;
    }
  }

  async getAllFactories() {
    try {
      const result = await apiFetch(`${this.apiUrl}/firestore/get?col=factories&limit=100&orderBy=createdAt&orderDirection=desc`, {
        cache: 'no-store'
      });

      return result.data;
    } catch (error) {
      console.error('Erro ao buscar fábricas:', error);
      throw error;
    }
  }

  async updateFactory(id, factoryData) {
    try {
      const response = await fetch(`${this.apiUrl}/firestore/update/factories/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(factoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar fábrica');
      }

      const result = { id, ...factoryData };
      
      // Limpar cache agressivamente após atualização
      await this.clearAllFactoryCache();
      
      // Disparar evento customizado para notificar componentes
      window.dispatchEvent(new CustomEvent('factoryUpdated', { 
        detail: { factoryId: id } 
      }));
      
      console.log('Cache limpo e evento disparado após atualização da fábrica');
      
      return result;
    } catch (error) {
      console.error('Erro ao atualizar fábrica:', error);
      throw error;
    }
  }

  // Função para limpar cache agressivamente no Vercel
  async clearAllFactoryCache() {
    try {
      // Limpar cache do serviço otimizado
      const optimizedService = await import('./optimizedFirebaseService');
      await optimizedService.default.invalidateCache('factories');
      
      // Limpeza agressiva de todas as chaves relacionadas a fábricas
      const cacheKeys = [
        'factoriesCache',
        'factoriesCacheTime',
        'cache_factories_page_1_limit_12',
        'cache_time_factories_page_1_limit_12',
        'cache_dashboard_initial_data',
        'cache_time_dashboard_initial_data',
        'factories_page_1_{}',
        'cache_factories_page_1_{}',
        'cache_time_factories_page_1_{}',
        'PMR_Cache',
        'global_tags'
      ];
      
      // Limpar localStorage
      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Limpar todas as chaves que começam com 'factories_' ou 'cache_factories_'
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('factories_') || 
          key.startsWith('cache_factories_') ||
          key.startsWith('cache_time_factories_') ||
          key.startsWith('tags_')
        )) {
          localStorage.removeItem(key);
        }
      }
      
      // Limpar IndexedDB se disponível
      if ('indexedDB' in window) {
        try {
          const deleteReq = indexedDB.deleteDatabase('PMR_Cache');
          deleteReq.onsuccess = () => {
            console.log('IndexedDB cache cleared');
          };
        } catch (e) {
          console.warn('Could not clear IndexedDB:', e);
        }
      }
      
      console.log('Cache agressivamente limpo para fábricas');
    } catch (error) {
      console.warn('Erro ao limpar cache:', error);
    }
  }

  async deleteFactory(id) {
    try {
      const response = await fetch(`${this.apiUrl}/firestore/delete/factories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar fábrica');
      }

      // Limpar cache agressivamente após exclusão
      await this.clearAllFactoryCache();
      
      // Disparar evento customizado para notificar componentes
      window.dispatchEvent(new CustomEvent('factoryDeleted', { 
        detail: { factoryId: id } 
      }));
      
      console.log('Cache limpo e evento disparado após exclusão da fábrica');

      return true;
    } catch (error) {
      console.error('Erro ao deletar fábrica:', error);
      throw error;
    }
  }

  async getFactoryById(id) {
    try {
      const response = await fetch(`${this.apiUrl}/firestore/get/factories/${id}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar fábrica');
      }

      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(result.error || 'Erro na resposta da API');
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao buscar fábrica por ID:', error);
      throw error;
    }
  }

  async getProductsByFactory(factoryId) {
    try {
      const response = await fetch(`${this.apiUrl}/firestore/products-by-factory?factoryId=${factoryId}&limit=100`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar produtos da fábrica');
      }

      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(result.error || 'Erro na resposta da API');
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao buscar produtos da fábrica:', error);
      throw error;
    }
  }

  async getFactoryWithProducts(factoryId) {
    try {
      const factory = await this.getFactoryById(factoryId);
      const products = await this.getProductsByFactory(factoryId);
      return { ...factory, products };
    } catch (error) {
      console.error('Erro ao buscar fábrica com produtos:', error);
      throw error;
    }
  }

  // Método para testar conexão com a API
  async testConnection() {
    try {
      const response = await fetch(`${this.apiUrl}/test`);
      if (response.ok) {
        const result = await response.json();
        console.log('Conexão com API OK:', result.message);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro na conexão com API:', error);
      return false;
    }
  }
}

const factoryServiceAPI = new FactoryServiceAPI();
export default factoryServiceAPI;
