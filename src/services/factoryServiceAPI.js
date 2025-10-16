import { apiFetch } from '../utils/apiUtils';

class FactoryServiceAPI {
  constructor() {
    // Detectar se está rodando no Vercel ou localmente
    this.isVercel = typeof window !== 'undefined' && 
      (window.location.protocol === 'https:' || 
       window.location.hostname.includes('vercel.app') || 
       window.location.hostname.includes('vercel.com') ||
       window.location.hostname.includes('gpreto.space'));
    
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
      return { id: result.id, ...factoryData };
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

      return { id, ...factoryData };
    } catch (error) {
      console.error('Erro ao atualizar fábrica:', error);
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
