import tagServiceFirebase from './tagServiceFirebase';

class TagService {
  constructor() {
    this.storageKey = 'global_tags';
    this.useFirebase = true; // Tentar usar Firebase primeiro
  }

  // Função para remover tags duplicadas
  removeDuplicateTags(tags) {
    if (!Array.isArray(tags)) return [];
    
    const seen = new Set();
    return tags.filter(tag => {
      // Criar uma chave única baseada no nome e divisão
      const key = `${tag.name.toLowerCase()}_${tag.division}`;
      if (seen.has(key)) {
        return false; // Tag duplicada removida silenciosamente
      }
      seen.add(key);
      return true;
    });
  }

  // Obter todas as tags globais
  async getAllTags() {
    try {
      // Tentar usar Firebase primeiro
      if (this.useFirebase) {
        try {
          const globalTags = await tagServiceFirebase.getAllGlobalTags();
          
          // Remover duplicatas de cada divisão
          const cleanedTags = {
            regiao: this.removeDuplicateTags(globalTags.regiao || []),
            material: this.removeDuplicateTags(globalTags.material || []),
            outros: this.removeDuplicateTags(globalTags.outros || [])
          };
          return cleanedTags;
        } catch (firebaseError) {
          console.warn('Erro ao carregar do Firebase, usando localStorage:', firebaseError);
          this.useFirebase = false; // Desabilitar Firebase temporariamente
        }
      }

      // Fallback para localStorage
      const tags = localStorage.getItem(this.storageKey);
      if (tags) {
        const parsedTags = JSON.parse(tags);
        // Garantir que a estrutura está correta e remover duplicatas
        return {
          regiao: this.removeDuplicateTags(Array.isArray(parsedTags.regiao) ? parsedTags.regiao : []),
          material: this.removeDuplicateTags(Array.isArray(parsedTags.material) ? parsedTags.material : []),
          outros: this.removeDuplicateTags(Array.isArray(parsedTags.outros) ? parsedTags.outros : []),
          tipoProduto: this.removeDuplicateTags(Array.isArray(parsedTags.tipoProduto) ? parsedTags.tipoProduto : [])
        };
      }
      
      return { regiao: [], material: [], outros: [], tipoProduto: [] };
    } catch (error) {
      console.error('Erro ao carregar tags globais:', error);
      return { regiao: [], material: [], outros: [], tipoProduto: [] };
    }
  }

  // Salvar todas as tags globais
  saveAllTags(tags) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(tags));
      return true;
    } catch (error) {
      console.error('Erro ao salvar tags globais:', error);
      return false;
    }
  }

  // Adicionar uma nova tag global
  async addTag(tag, factoryId = null) {
    try {
      // Tentar usar Firebase primeiro
      if (this.useFirebase) {
        try {
          const result = await tagServiceFirebase.createTag(tag, factoryId);
          console.log('Tag adicionada ao Firebase:', result);
          return { success: true, message: 'Tag adicionada com sucesso', id: result.id };
        } catch (firebaseError) {
          console.warn('Erro ao salvar no Firebase, usando localStorage:', firebaseError);
          this.useFirebase = false; // Desabilitar Firebase temporariamente
        }
      }

      // Fallback para localStorage
      const allTags = await this.getAllTags();
      
      // Verificar se a tag já existe
      const existingTag = allTags[tag.division].find(t => t.name === tag.name);
      if (existingTag) {
        return { success: false, message: 'Tag já existe' };
      }

      // Adicionar a nova tag
      allTags[tag.division].push(tag);
      
      // Salvar de volta
      this.saveAllTags(allTags);
      
      return { success: true, message: 'Tag adicionada com sucesso' };
    } catch (error) {
      console.error('Erro ao adicionar tag:', error);
      return { success: false, message: 'Erro ao adicionar tag' };
    }
  }

  // Remover uma tag global
  async removeTag(tagId, division) {
    try {
      console.log('=== REMOVE TAG ===');
      console.log('Tag ID:', tagId);
      console.log('Division:', division);
      
      const allTags = await this.getAllTags();
      console.log('All tags before removal:', allTags);
      
      // Verificar se a divisão existe e é um array
      if (!allTags || !allTags[division] || !Array.isArray(allTags[division])) {
        console.error('Division not found or not an array:', division);
        return { success: false, message: 'Divisão não encontrada' };
      }
      
      const originalLength = allTags[division].length;
      allTags[division] = allTags[division].filter(tag => tag.id !== tagId);
      const newLength = allTags[division].length;
      
      console.log('Tags removed:', originalLength - newLength);
      
      // Salvar localmente
      this.saveAllTags(allTags);
      
      // Tentar remover do Firebase também
      if (this.useFirebase) {
        try {
          console.log('Attempting to remove tag from Firebase...');
          await tagServiceFirebase.deleteTag(tagId);
          console.log('Tag successfully removed from Firebase');
        } catch (firebaseError) {
          console.warn('Failed to remove tag from Firebase:', firebaseError);
          // Continuar mesmo se Firebase falhar
        }
      }
      
      // Remover também das fábricas que possuem essa tag
      this.removeTagFromAllFactories(tagId, division);
      
      return { success: true, message: 'Tag removida com sucesso' };
    } catch (error) {
      console.error('Erro ao remover tag:', error);
      return { success: false, message: 'Erro ao remover tag' };
    }
  }

  // Atualizar uma tag global
  updateTag(tagId, division, updatedTag) {
    try {
      const allTags = this.getAllTags();
      const tagIndex = allTags[division].findIndex(tag => tag.id === tagId);
      
      if (tagIndex === -1) {
        return { success: false, message: 'Tag não encontrada' };
      }

      allTags[division][tagIndex] = { ...updatedTag, id: tagId };
      this.saveAllTags(allTags);
      
      // Atualizar também nas fábricas que possuem essa tag
      this.updateTagInAllFactories(tagId, division, updatedTag);
      
      return { success: true, message: 'Tag atualizada com sucesso' };
    } catch (error) {
      console.error('Erro ao atualizar tag:', error);
      return { success: false, message: 'Erro ao atualizar tag' };
    }
  }

  // Obter tags de uma fábrica específica
  async getFactoryTags(factoryId) {
    try {
      // Tentar usar Firebase primeiro
      if (this.useFirebase) {
        try {
          const tags = await tagServiceFirebase.getFactoryTags(factoryId);
          // Remover duplicatas de cada divisão
          const cleanedTags = {
            regiao: this.removeDuplicateTags(tags.regiao || []),
            material: this.removeDuplicateTags(tags.material || []),
            outros: this.removeDuplicateTags(tags.outros || [])
          };
          
          return cleanedTags;
        } catch (firebaseError) {
          console.warn('Erro ao carregar do Firebase, usando localStorage:', firebaseError);
          this.useFirebase = false; // Desabilitar Firebase temporariamente
        }
      }

      // Fallback para localStorage
      const factoryTags = localStorage.getItem(`tags_${factoryId}`);
      if (factoryTags) {
        const parsedTags = JSON.parse(factoryTags);
        // Garantir que a estrutura está correta e remover duplicatas
        return {
          regiao: this.removeDuplicateTags(Array.isArray(parsedTags.regiao) ? parsedTags.regiao : []),
          material: this.removeDuplicateTags(Array.isArray(parsedTags.material) ? parsedTags.material : []),
          outros: this.removeDuplicateTags(Array.isArray(parsedTags.outros) ? parsedTags.outros : []),
          tipoProduto: this.removeDuplicateTags(Array.isArray(parsedTags.tipoProduto) ? parsedTags.tipoProduto : [])
        };
      }
      
      return { regiao: [], material: [], outros: [], tipoProduto: [] };
    } catch (error) {
      console.error('Erro ao carregar tags da fábrica:', error);
      return { regiao: [], material: [], outros: [], tipoProduto: [] };
    }
  }

  // Adicionar tag a uma fábrica específica
  async addTagToFactory(factoryId, tag) {
    try {
      // Tentar usar Firebase primeiro
      if (this.useFirebase) {
        try {
          const result = await tagServiceFirebase.createTag(tag, factoryId);
          console.log('Tag adicionada à fábrica no Firebase:', result);
          return { success: true, message: 'Tag adicionada à fábrica', id: result.id };
        } catch (firebaseError) {
          console.warn('Erro ao salvar no Firebase, usando localStorage:', firebaseError);
          this.useFirebase = false; // Desabilitar Firebase temporariamente
        }
      }

      // Fallback para localStorage
      const factoryTags = await this.getFactoryTags(factoryId);
      
      // Verificar se a tag já existe na fábrica
      const existingTag = factoryTags[tag.division].find(t => t.id === tag.id);
      if (existingTag) {
        return { success: false, message: 'Tag já existe nesta fábrica' };
      }

      // Adicionar a tag à fábrica
      factoryTags[tag.division].push(tag);
      
      // Salvar as tags da fábrica
      localStorage.setItem(`tags_${factoryId}`, JSON.stringify(factoryTags));
      
      return { success: true, message: 'Tag adicionada à fábrica' };
    } catch (error) {
      console.error('Erro ao adicionar tag à fábrica:', error);
      return { success: false, message: 'Erro ao adicionar tag à fábrica' };
    }
  }

  // Remover tag de uma fábrica específica
  async removeTagFromFactory(factoryId, tagId, division) {
    try {
      console.log('=== REMOVE TAG FROM FACTORY ===');
      console.log('Factory ID:', factoryId);
      console.log('Tag ID:', tagId);
      console.log('Division:', division);
      
      const factoryTags = await this.getFactoryTags(factoryId);
      console.log('Factory tags before removal:', factoryTags);
      
      // Verificar se a divisão existe e é um array
      if (!factoryTags || !factoryTags[division] || !Array.isArray(factoryTags[division])) {
        console.error('Division not found or not an array:', division);
        return { success: false, message: 'Divisão não encontrada na fábrica' };
      }
      
      const originalLength = factoryTags[division].length;
      factoryTags[division] = factoryTags[division].filter(tag => tag.id !== tagId);
      const newLength = factoryTags[division].length;
      
      console.log('Tags removed from factory:', originalLength - newLength);
      
      localStorage.setItem(`tags_${factoryId}`, JSON.stringify(factoryTags));
      
      return { success: true, message: 'Tag removida da fábrica' };
    } catch (error) {
      console.error('Erro ao remover tag da fábrica:', error);
      return { success: false, message: 'Erro ao remover tag da fábrica' };
    }
  }

  // Remover tag de todas as fábricas
  removeTagFromAllFactories(tagId, division) {
    try {
      // Obter todas as fábricas do localStorage
      const factories = JSON.parse(localStorage.getItem('factories') || '[]');
      
      factories.forEach(factory => {
        if (factory.id) {
          const factoryTags = this.getFactoryTags(factory.id);
          factoryTags[division] = factoryTags[division].filter(tag => tag.id !== tagId);
          localStorage.setItem(`tags_${factory.id}`, JSON.stringify(factoryTags));
        }
      });
    } catch (error) {
      console.error('Erro ao remover tag de todas as fábricas:', error);
    }
  }

  // Atualizar tag em todas as fábricas
  updateTagInAllFactories(tagId, division, updatedTag) {
    try {
      // Obter todas as fábricas do localStorage
      const factories = JSON.parse(localStorage.getItem('factories') || '[]');
      
      factories.forEach(factory => {
        if (factory.id) {
          const factoryTags = this.getFactoryTags(factory.id);
          const tagIndex = factoryTags[division].findIndex(tag => tag.id === tagId);
          
          if (tagIndex !== -1) {
            factoryTags[division][tagIndex] = { ...updatedTag, id: tagId };
            localStorage.setItem(`tags_${factory.id}`, JSON.stringify(factoryTags));
          }
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar tag em todas as fábricas:', error);
    }
  }

  // Sincronizar tags globais com todas as fábricas
  syncGlobalTags() {
    try {
      const globalTags = this.getAllTags();
      
      // Obter todas as fábricas do localStorage
      const factories = JSON.parse(localStorage.getItem('factories') || '[]');
      
      factories.forEach(factory => {
        if (factory.id) {
          const factoryTags = this.getFactoryTags(factory.id);
          
          // Adicionar tags da fábrica ao global se não existirem
          Object.keys(factoryTags).forEach(division => {
            if (factoryTags[division]) {
              factoryTags[division].forEach(tag => {
                const existingTag = globalTags[division].find(t => t.name === tag.name);
                if (!existingTag) {
                  globalTags[division].push(tag);
                }
              });
            }
          });
        }
      });
      
      this.saveAllTags(globalTags);
    } catch (error) {
      console.error('Erro ao sincronizar tags globais:', error);
    }
  }

  // Obter tags disponíveis para uma fábrica (tags globais que não estão na fábrica)
  getAvailableTagsForFactory(factoryId) {
    try {
      const globalTags = this.getAllTags();
      const factoryTags = this.getFactoryTags(factoryId);
      
      const availableTags = {
        regiao: [],
        material: [],
        outros: []
      };
      
      Object.keys(globalTags).forEach(division => {
        availableTags[division] = globalTags[division].filter(globalTag => 
          !factoryTags[division].some(factoryTag => factoryTag.id === globalTag.id)
        );
      });
      
      return availableTags;
    } catch (error) {
      console.error('Erro ao obter tags disponíveis:', error);
      return { regiao: [], material: [], outros: [], tipoProduto: [] };
    }
  }

  // Testar conexão com Firebase
  async testConnection() {
    try {
      if (this.useFirebase) {
        const result = await tagServiceFirebase.testConnection();
        console.log('TagService.testConnection - Firebase result:', result);
        return result;
      }
      return { success: false, error: 'Firebase not enabled', details: 'useFirebase is false' };
    } catch (error) {
      console.error('TagService.testConnection - Error:', error);
      return { success: false, error: 'Test failed', details: error.message };
    }
  }
}

const tagService = new TagService();

export default tagService;
