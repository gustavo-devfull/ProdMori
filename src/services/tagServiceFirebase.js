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

      // Verificar se já existe uma tag com o mesmo nome na mesma divisão
      const existingTags = await this.getTags(null, tagData.division);
      const duplicateTag = existingTags.find(tag => {
        const tagDataToCheck = tag.tagData || tag;
        return tagDataToCheck.name === tagData.name && tagDataToCheck.division === tagData.division;
      });
      
      if (duplicateTag) {
        console.log('TagServiceFirebase.createTag - Tag já existe:', duplicateTag);
        return { 
          success: false, 
          message: 'Tag já existe', 
          existingTag: duplicateTag 
        };
      }

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

  // Buscar tags do localStorage como fallback
  getTagsFromLocalStorage(factoryId = null, division = null) {
    try {
      let tags = [];
      
      if (factoryId) {
        // Buscar tags específicas da fábrica
        const savedTags = localStorage.getItem(`tags_${factoryId}`);
        if (savedTags) {
          const factoryTags = JSON.parse(savedTags);
          tags = [
            ...(factoryTags.regiao || []),
            ...(factoryTags.material || []),
            ...(factoryTags.outros || []),
            ...(factoryTags.tipoProduto || [])
          ];
        }
      } else {
        // Buscar todas as tags globais
        const globalTags = localStorage.getItem('globalTags');
        if (globalTags) {
          const parsedGlobalTags = JSON.parse(globalTags);
          tags = [
            ...(parsedGlobalTags.regiao || []),
            ...(parsedGlobalTags.material || []),
            ...(parsedGlobalTags.outros || []),
            ...(parsedGlobalTags.tipoProduto || [])
          ];
        }
      }
      
      // Filtrar por divisão se especificado
      if (division) {
        tags = tags.filter(tag => tag.division === division);
      }
      
      return {
        success: true,
        data: tags,
        count: tags.length,
        fallback: true
      };
    } catch (error) {
      console.error('Erro ao buscar tags do localStorage:', error);
      return {
        success: true,
        data: [],
        count: 0,
        fallback: true,
        error: error.message
      };
    }
  }

  // Buscar tags do Firebase
  async getTags(factoryId = null, division = null) {
    try {
      // Buscar tags do Firebase (log removido para reduzir poluição do console)

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

      const result = await response.json();
      
      console.log('TagServiceFirebase.getTags - Response:', response.ok);
      console.log('TagServiceFirebase.getTags - Result:', result);
      console.log('TagServiceFirebase.getTags - Fallback:', result.fallback);
      console.log('TagServiceFirebase.getTags - Error:', result.error);
      
      // Se houver erro de quota ou Firebase indisponível, usar localStorage
      if (!response.ok || result.fallback || result.error) {
        console.log('TagServiceFirebase.getTags - Using localStorage fallback');
        return this.getTagsFromLocalStorage(factoryId, division);
      }
      
      // Extrair os dados das tags do formato Firebase
      const extractedTags = result.data.map(item => {
        // Verificar se tem estrutura tagData ou se é plano
        const tagData = item.tagData || item;
        
        // Para backups de associação, usar tagName e tagDivision
        const name = tagData.name || item.tagName || item.name;
        const division = tagData.division || item.tagDivision || item.division;
        
        return {
          id: item.id,
          name: name,
          division: division,
          createdAt: tagData.createdAt || item.createdAt,
          updatedAt: tagData.updatedAt || item.updatedAt,
          factoryId: item.factoryId || null,
          type: item.type || null
        };
      }).filter(tag => tag.name && tag.division); // Filtrar tags válidas
      
      return extractedTags;
    } catch (error) {
      console.error('TagServiceFirebase.getTags - Error:', error);
      console.log('Erro no Firebase, usando localStorage como fallback');
      return this.getTagsFromLocalStorage(factoryId, division);
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

  // Associar uma tag global existente a uma fábrica (versão simplificada)
  async associateTagToFactory(tagId, factoryId) {
    try {
      console.log('TagServiceFirebase.associateTagToFactory - Associando tag:', { tagId, factoryId });

      // Como a API de associação não existe, vamos apenas retornar sucesso
      // A associação real acontece quando a tag é criada com factoryId
      console.log('TagServiceFirebase.associateTagToFactory - Associação simulada (API não implementada)');
      
      return { 
        success: true, 
        message: 'Tag associada com sucesso (simulado)',
        tagId: tagId,
        factoryId: factoryId
      };
    } catch (error) {
      console.error('TagServiceFirebase.associateTagToFactory - Error:', error);
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
        outros: [],
        tipoProduto: []
      };

      // Garantir que tags é um array
      const tagsArray = Array.isArray(tags) ? tags : [];
      
      tagsArray.forEach(tag => {
        // Extrair dados reais de tagData se existir
        const tagData = tag.tagData || tag;
        const division = tagData.division;
        
        if (division && organizedTags[division]) {
          // Criar objeto tag com estrutura correta
          const processedTag = {
            id: tag.id,
            name: tagData.name,
            division: division,
            createdAt: tag.createdAt || tagData.createdAt,
            updatedAt: tag.updatedAt || tagData.updatedAt,
            factoryId: tag.factoryId
          };
          
          organizedTags[division].push(processedTag);
        }
      });

      return organizedTags;
    } catch (error) {
      console.error('TagServiceFirebase.getFactoryTags - Error:', error);
      return { regiao: [], material: [], outros: [], tipoProduto: [] };
    }
  }

  // Obter todas as tags globais (sem filtro de fábrica)
  async getAllGlobalTags() {
    try {
      console.log('TagServiceFirebase.getAllGlobalTags - Iniciando busca de tags globais...');
      const tags = await this.getTags();
      console.log('TagServiceFirebase.getAllGlobalTags - Tags brutas recebidas:', tags);
      console.log('TagServiceFirebase.getAllGlobalTags - Quantidade de tags:', tags?.length || 0);
      
      // Organizar tags por divisão
      const organizedTags = {
        regiao: [],
        material: [],
        outros: [],
        tipoProduto: []
      };

      // Garantir que tags é um array
      const tagsArray = Array.isArray(tags) ? tags : [];
      console.log('TagServiceFirebase.getAllGlobalTags - Tags como array:', tagsArray.length);
      
      tagsArray.forEach((tag, index) => {
        console.log(`TagServiceFirebase.getAllGlobalTags - Processing tag ${index}:`, tag);
        
        // Extrair dados reais de tagData se existir
        const tagData = tag.tagData || tag;
        
        // Para backups de associação, usar tagName e tagDivision
        const name = tagData.name || tag.tagName || tag.name;
        const division = tagData.division || tag.tagDivision || tag.division;
        
        console.log(`TagServiceFirebase.getAllGlobalTags - Tag ${index} - division: ${division}, name: ${name}`);
        
        // Filtrar apenas tags válidas e não backups de associação
        if (division && name && organizedTags[division] && tag.type !== 'association_backup') {
          // Criar objeto tag com estrutura correta
          const processedTag = {
            id: tag.id,
            name: name,
            division: division,
            createdAt: tag.createdAt || tagData.createdAt,
            updatedAt: tag.updatedAt || tagData.updatedAt,
            factoryId: tag.factoryId
          };
          
          organizedTags[division].push(processedTag);
          console.log(`TagServiceFirebase.getAllGlobalTags - Added to ${division}:`, name);
        } else if (tag.type === 'association_backup') {
          console.log(`TagServiceFirebase.getAllGlobalTags - Skipping association backup:`, name);
        } else {
          console.warn('TagServiceFirebase.getAllGlobalTags - Invalid division:', division, 'for tag:', name);
        }
      });

      console.log('TagServiceFirebase.getAllGlobalTags - Final organized tags:', organizedTags);
      return organizedTags;
    } catch (error) {
      console.error('TagServiceFirebase.getAllGlobalTags - Error:', error);
      return { regiao: [], material: [], outros: [], tipoProduto: [] };
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

// Verificar se todos os métodos estão disponíveis
if (!tagServiceFirebase.createTag) {
  console.error('TagServiceFirebase.createTag method is missing');
}

export default tagServiceFirebase;
