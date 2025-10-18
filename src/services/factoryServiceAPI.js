import firebasePersistence from '../utils/firebasePersistence';

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
      
      // Limpar cache e preparar para sincronização
      await this.syncWithFirebaseAndClearCache();
      
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
      console.log('🔥 Forçando dados frescos do Firebase para fábricas...');
      
      // Usar estratégia mais agressiva de persistência
      const url = `${this.apiUrl}/firestore/get?col=factories&limit=100&orderBy=createdAt&orderDirection=desc`;
      
      const result = await firebasePersistence.forceFirebaseData(url, {
        method: 'GET'
      });

      console.log('✅ Fábricas carregadas do Firebase:', result.data?.length || 0);
      return result.data;
    } catch (error) {
      console.error('❌ Erro ao buscar fábricas do Firebase:', error);
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
      
      // Limpar cache e preparar para sincronização
      await this.syncWithFirebaseAndClearCache();
      
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

  // Detectar se é mobile
  isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  // Função para sincronizar com Firebase e limpar cache
  async syncWithFirebaseAndClearCache() {
    try {
      console.log('🔥 factoryServiceAPI - Sincronização agressiva com Firebase...');
      
      // Usar estratégia mais agressiva de persistência
      const shouldRefresh = await firebasePersistence.forceSyncWithFirebase();
      
      if (shouldRefresh) {
        console.log('📱 Refresh da página será executado pelo firebasePersistence');
        return;
      }
      
      // Limpar cache do serviço otimizado
      const optimizedService = await import('./optimizedFirebaseService');
      await optimizedService.default.invalidateCache('factories');
      
      console.log('✅ Cache limpo e sincronização com Firebase concluída');
    } catch (error) {
      console.error('❌ Erro na sincronização com Firebase:', error);
      throw error;
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

      // Limpar cache e preparar para sincronização
      await this.syncWithFirebaseAndClearCache();
      
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
        if (response.status === 404) {
          throw new Error('Documento não encontrado');
        }
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
