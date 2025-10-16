class TagService {
  constructor() {
    this.storageKey = 'global_tags';
  }

  // Obter todas as tags globais
  getAllTags() {
    try {
      const tags = localStorage.getItem(this.storageKey);
      return tags ? JSON.parse(tags) : { regiao: [], material: [], outros: [] };
    } catch (error) {
      console.error('Erro ao carregar tags globais:', error);
      return { regiao: [], material: [], outros: [] };
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
  addTag(tag) {
    try {
      const allTags = this.getAllTags();
      
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
  removeTag(tagId, division) {
    try {
      const allTags = this.getAllTags();
      allTags[division] = allTags[division].filter(tag => tag.id !== tagId);
      
      this.saveAllTags(allTags);
      
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
  getFactoryTags(factoryId) {
    try {
      const factoryTags = localStorage.getItem(`tags_${factoryId}`);
      return factoryTags ? JSON.parse(factoryTags) : { regiao: [], material: [], outros: [] };
    } catch (error) {
      console.error('Erro ao carregar tags da fábrica:', error);
      return { regiao: [], material: [], outros: [] };
    }
  }

  // Adicionar tag a uma fábrica específica
  addTagToFactory(factoryId, tag) {
    try {
      const factoryTags = this.getFactoryTags(factoryId);
      
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
  removeTagFromFactory(factoryId, tagId, division) {
    try {
      const factoryTags = this.getFactoryTags(factoryId);
      factoryTags[division] = factoryTags[division].filter(tag => tag.id !== tagId);
      
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
      return { regiao: [], material: [], outros: [] };
    }
  }
}

const tagService = new TagService();

export default tagService;
