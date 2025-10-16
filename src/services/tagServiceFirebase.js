class TagServiceFirebase {
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
    
    console.log('TagServiceFirebase initialized:', {
      isVercel: this.isVercel,
      apiUrl: this.apiUrl
    });
  }

  // Criar uma nova tag no Firebase
  async createTag(tagData, factoryId) {
    try {
      console.log('TagServiceFirebase.createTag - Creating tag:', { tagData, factoryId });

      const response = await fetch(`${this.apiUrl}/firestore/create/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagData, factoryId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar tag');
      }

      const result = await response.json();
      console.log('TagServiceFirebase.createTag - Tag created:', result);
      return result;
    } catch (error) {
      console.error('TagServiceFirebase.createTag - Error:', error);
      throw error;
    }
  }

  // Buscar tags do Firebase
  async getTags(factoryId = null, division = null) {
    try {
      console.log('TagServiceFirebase.getTags - Getting tags:', { factoryId, division });

      let url = `${this.apiUrl}/firestore/get/tags`;
      const params = new URLSearchParams();
      
      if (factoryId) params.append('factoryId', factoryId);
      if (division) params.append('division', division);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar tags');
      }

      const result = await response.json();
      console.log('TagServiceFirebase.getTags - Tags found:', result);
      return result.data;
    } catch (error) {
      console.error('TagServiceFirebase.getTags - Error:', error);
      throw error;
    }
  }

  // Atualizar uma tag no Firebase
  async updateTag(tagId, tagData) {
    try {
      console.log('TagServiceFirebase.updateTag - Updating tag:', { tagId, tagData });

      const response = await fetch(`${this.apiUrl}/firestore/update/tags`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagId, tagData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar tag');
      }

      const result = await response.json();
      console.log('TagServiceFirebase.updateTag - Tag updated:', result);
      return result;
    } catch (error) {
      console.error('TagServiceFirebase.updateTag - Error:', error);
      throw error;
    }
  }

  // Deletar uma tag do Firebase
  async deleteTag(tagId) {
    try {
      console.log('TagServiceFirebase.deleteTag - Deleting tag:', tagId);

      const response = await fetch(`${this.apiUrl}/firestore/delete/tags`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tagId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar tag');
      }

      const result = await response.json();
      console.log('TagServiceFirebase.deleteTag - Tag deleted:', result);
      return result;
    } catch (error) {
      console.error('TagServiceFirebase.deleteTag - Error:', error);
      throw error;
    }
  }

  // Obter tags de uma fábrica específica
  async getFactoryTags(factoryId) {
    try {
      const tags = await this.getTags(factoryId);
      
      // Organizar tags por divisão
      const organizedTags = {
        regiao: [],
        material: [],
        outros: []
      };

      tags.forEach(tag => {
        if (organizedTags[tag.division]) {
          organizedTags[tag.division].push(tag);
        }
      });

      console.log('TagServiceFirebase.getFactoryTags - Organized tags:', organizedTags);
      return organizedTags;
    } catch (error) {
      console.error('TagServiceFirebase.getFactoryTags - Error:', error);
      return { regiao: [], material: [], outros: [] };
    }
  }

  // Obter todas as tags globais (sem filtro de fábrica)
  async getAllGlobalTags() {
    try {
      const tags = await this.getTags();
      
      // Organizar tags por divisão
      const organizedTags = {
        regiao: [],
        material: [],
        outros: []
      };

      tags.forEach(tag => {
        if (organizedTags[tag.division]) {
          organizedTags[tag.division].push(tag);
        }
      });

      console.log('TagServiceFirebase.getAllGlobalTags - Global tags:', organizedTags);
      return organizedTags;
    } catch (error) {
      console.error('TagServiceFirebase.getAllGlobalTags - Error:', error);
      return { regiao: [], material: [], outros: [] };
    }
  }

  // Testar conexão com Firebase
  async testConnection() {
    try {
      console.log('TagServiceFirebase.testConnection - Testing connection...');
      
      // Tentar fazer uma requisição simples para verificar se a API está funcionando
      const response = await fetch(`${this.apiUrl}/firestore/get/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('TagServiceFirebase.testConnection - Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('TagServiceFirebase.testConnection - API Error:', errorData);
        return { success: false, error: errorData.error || 'API Error', details: errorData.details };
      }

      const result = await response.json();
      console.log('TagServiceFirebase.testConnection - Success:', result);
      return { success: true, message: 'Firebase connection OK', data: result };
      
    } catch (error) {
      console.error('TagServiceFirebase.testConnection - Connection failed:', error);
      return { success: false, error: 'Connection failed', details: error.message };
    }
  }
}

const tagServiceFirebase = new TagServiceFirebase();

export default tagServiceFirebase;
