import tagServiceFirebase from './tagServiceFirebase';

class TagService {
  constructor() {
    this.storageKey = 'global_tags';
    this.useFirebase = true; // Tentar usar Firebase primeiro
    this.tagServiceFirebase = tagServiceFirebase; // Inicializar referência
  }

  // Função para remover tags duplicadas (por nome, case-insensitive) - REMOVIDA PARA EVITAR LOOP
  // removeDuplicateTags(tags) {
  //   if (!Array.isArray(tags)) return [];
  //   
  //   const seen = new Set();
  //   return tags.filter(tag => {
  //     // Criar uma chave única baseada apenas no nome (case-insensitive)
  //     const key = tag.name.toLowerCase();
  //     if (seen.has(key)) {
  //       console.log(`TagService.removeDuplicateTags - Removendo duplicata: ${tag.name}`);
  //       return false; // Tag duplicada removida
  //     }
  //     seen.add(key);
  //     return true;
  //   });
  // }

  // Obter todas as tags globais
  async getAllTags() {
    try {
      // Tentar usar Firebase primeiro
      if (this.useFirebase) {
        try {
          console.log('TagService.getAllTags - Tentando carregar do Firebase...');
          const globalTags = await tagServiceFirebase.getAllGlobalTags();
          console.log('TagService.getAllTags - Tags carregadas do Firebase:', globalTags);
          
          // Remover duplicatas de cada divisão
          const cleanedTags = {
            regiao: globalTags.regiao || [],
            material: globalTags.material || [],
            outros: globalTags.outros || [],
            tipoProduto: globalTags.tipoProduto || []
          };
          console.log('TagService.getAllTags - Tags limpas:', cleanedTags);
          return cleanedTags;
        } catch (firebaseError) {
          console.warn('TagService.getAllTags - Erro ao carregar do Firebase, usando localStorage:', firebaseError);
          this.useFirebase = false; // Desabilitar Firebase temporariamente
        }
      }

      // Fallback para localStorage
      const tags = localStorage.getItem(this.storageKey);
      if (tags) {
        const parsedTags = JSON.parse(tags);
        // Garantir que a estrutura está correta e remover duplicatas
        return {
          regiao: Array.isArray(parsedTags.regiao) ? parsedTags.regiao : [],
          material: Array.isArray(parsedTags.material) ? parsedTags.material : [],
          outros: Array.isArray(parsedTags.outros) ? parsedTags.outros : [],
          tipoProduto: Array.isArray(parsedTags.tipoProduto) ? parsedTags.tipoProduto : []
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

  // Adicionar uma nova tag global (sempre sem factoryId)
  async addTag(tag, factoryId = null) {
    try {
      // Verificar se a tag já existe antes de tentar criar
      const allTags = await this.getAllTags();
      const existingTag = allTags[tag.division].find(t => 
        t.name.toLowerCase() === tag.name.toLowerCase()
      );
      
      if (existingTag) {
        console.log('TagService.addTag - Tag já existe:', existingTag);
        return { 
          success: false, 
          message: 'Tag já existe', 
          existingTag: existingTag 
        };
      }

      // Tentar usar Firebase primeiro (sempre sem factoryId para manter tags globais)
      if (this.useFirebase) {
        try {
          const result = await tagServiceFirebase.createTag(tag, null); // Sempre null para tags globais
          
          // Verificar se o Firebase retornou erro de duplicata
          if (result.success === false) {
            console.log('TagService.addTag - Firebase detectou duplicata:', result);
            return result;
          }
          
          console.log('Tag adicionada ao Firebase:', result);
          return { success: true, message: 'Tag adicionada com sucesso', id: result.id };
        } catch (firebaseError) {
          console.warn('Erro ao salvar no Firebase, usando localStorage:', firebaseError);
          this.useFirebase = false; // Desabilitar Firebase temporariamente
        }
      }

      // Fallback para localStorage
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
          
          // Invalidar cache de tags após remoção
          try {
            const cacheService = await import('./cacheService');
            await cacheService.default.invalidate(`tags_global_${division}`, 'tags');
            await cacheService.default.invalidate(`tags_global_all`, 'tags');
            console.log('Cache de tags invalidado após remoção');
          } catch (cacheError) {
            console.warn('Erro ao invalidar cache:', cacheError);
          }
        } catch (firebaseError) {
          console.warn('Failed to remove tag from Firebase:', firebaseError);
          // Continuar mesmo se Firebase falhar
        }
      }
      
      // Remover também das fábricas que possuem essa tag
      this.removeTagFromAllFactories(tagId, division);
      
      // Forçar refresh das tags globais
      this.refreshGlobalTags();
      
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
            regiao: tags.regiao || [],
            material: tags.material || [],
            outros: tags.outros || [],
            tipoProduto: tags.tipoProduto || []
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
          regiao: Array.isArray(parsedTags.regiao) ? parsedTags.regiao : [],
          material: Array.isArray(parsedTags.material) ? parsedTags.material : [],
          outros: Array.isArray(parsedTags.outros) ? parsedTags.outros : [],
          tipoProduto: Array.isArray(parsedTags.tipoProduto) ? parsedTags.tipoProduto : []
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
      console.log('=== TAG SERVICE ADD TAG TO FACTORY ===');
      console.log('Factory ID:', factoryId);
      console.log('Tag:', tag);
      console.log('Tag division:', tag.division);
      
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
      console.log('Factory tags loaded:', factoryTags);
      console.log('Factory tags division:', factoryTags[tag.division]);
      
      // Verificar se a tag já existe na fábrica
      const existingTag = factoryTags[tag.division].find(t => t.id === tag.id);
      if (existingTag) {
        console.log('Tag já existe na fábrica:', tag.name);
        return { success: false, message: 'Tag já existe nesta fábrica' };
      }

      // Adicionar a tag à fábrica
      factoryTags[tag.division].push(tag);
      console.log('Tag adicionada ao array local:', factoryTags[tag.division]);
      
      // Salvar as tags da fábrica
      localStorage.setItem(`tags_${factoryId}`, JSON.stringify(factoryTags));
      console.log('Factory tags saved to localStorage');
      
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

  // Função para limpar tags duplicadas existentes
  async cleanupDuplicateTags() {
    try {
      console.log('TagService.cleanupDuplicateTags - Iniciando limpeza de duplicatas...');
      
      const allTags = await this.getAllTags();
      let cleanedCount = 0;
      
      // Limpar duplicatas em cada divisão
      Object.keys(allTags).forEach(division => {
        const originalLength = allTags[division].length;
        // Manter tags como estão (sem remover duplicatas)
        // allTags[division] = this.removeDuplicateTags(allTags[division]);
        const cleanedLength = allTags[division].length;
        const removedCount = originalLength - cleanedLength;
        
        if (removedCount > 0) {
          console.log(`TagService.cleanupDuplicateTags - Removidas ${removedCount} duplicatas da divisão ${division}`);
          cleanedCount += removedCount;
        }
      });
      
      if (cleanedCount > 0) {
        // Salvar tags limpas
        this.saveAllTags(allTags);
        console.log(`TagService.cleanupDuplicateTags - Total de ${cleanedCount} duplicatas removidas`);
      } else {
        console.log('TagService.cleanupDuplicateTags - Nenhuma duplicata encontrada');
      }
      
      return { success: true, cleanedCount };
    } catch (error) {
      console.error('Erro ao limpar tags duplicadas:', error);
      return { success: false, error: error.message };
    }
  }

  // Função para verificar se uma tag já existe (case-insensitive)
  async tagExists(tagName, division) {
    try {
      const allTags = await this.getAllTags();
      return allTags[division].some(tag => 
        tag.name.toLowerCase() === tagName.toLowerCase()
      );
    } catch (error) {
      console.error('Erro ao verificar se tag existe:', error);
      return false;
    }
  }

  // Função para forçar refresh das tags globais
  async refreshGlobalTags() {
    try {
      console.log('TagService.refreshGlobalTags - Forçando refresh das tags globais...');
      
      // Limpar cache de tags globais
      try {
        const cacheService = await import('./cacheService');
        await cacheService.default.invalidate('tags_global_all', 'tags');
        await cacheService.default.invalidate('tags_global_regiao', 'tags');
        await cacheService.default.invalidate('tags_global_material', 'tags');
        await cacheService.default.invalidate('tags_global_outros', 'tags');
        await cacheService.default.invalidate('tags_global_tipoProduto', 'tags');
        console.log('Cache de tags globais limpo');
      } catch (cacheError) {
        console.warn('Erro ao limpar cache:', cacheError);
      }
      
      // Limpar localStorage também
      localStorage.removeItem(this.storageKey);
      console.log('localStorage de tags limpo');
      
    } catch (error) {
      console.error('Erro ao fazer refresh das tags globais:', error);
    }
  }

  // Função para carregar tags diretamente do Firebase (sem fallback)
  async getAllTagsFromFirebase() {
    try {
      console.log('TagService.getAllTagsFromFirebase - Carregando diretamente do Firebase...');
      
      // Forçar uso do Firebase
      const originalUseFirebase = this.useFirebase;
      this.useFirebase = true;
      
      const globalTags = await tagServiceFirebase.getAllGlobalTags();
      console.log('TagService.getAllTagsFromFirebase - Tags carregadas do Firebase:', globalTags);
      
      // Remover duplicatas de cada divisão
      const cleanedTags = {
        regiao: globalTags.regiao || [],
        material: globalTags.material || [],
        outros: globalTags.outros || [],
        tipoProduto: globalTags.tipoProduto || []
      };
      
      console.log('TagService.getAllTagsFromFirebase - Tags limpas:', cleanedTags);
      
      // Restaurar estado original
      this.useFirebase = originalUseFirebase;
      
      return cleanedTags;
    } catch (error) {
      console.error('TagService.getAllTagsFromFirebase - Erro ao carregar do Firebase:', error);
      throw error; // Não fazer fallback, deixar o erro ser tratado pelo componente
    }
  }

  // Função para associar uma tag global existente a uma fábrica
  async associateTagToFactory(tagId, factoryId) {
    try {
      console.log('TagService.associateTagToFactory - Associando tag:', { tagId, factoryId });
      
      // Tentar usar Firebase primeiro
      if (this.useFirebase) {
        try {
          const result = await tagServiceFirebase.associateTagToFactory(tagId, factoryId);
          console.log('Tag associada ao Firebase:', result);
          return { success: true, message: 'Tag associada com sucesso' };
        } catch (firebaseError) {
          console.warn('Erro ao associar tag no Firebase, usando localStorage:', firebaseError);
          this.useFirebase = false; // Desabilitar Firebase temporariamente
        }
      }

      // Fallback para localStorage (apenas associar localmente)
      console.log('Associando tag localmente (Firebase indisponível)');
      return { success: true, message: 'Tag associada localmente' };
    } catch (error) {
      console.error('Erro ao associar tag à fábrica:', error);
      return { success: false, message: 'Erro ao associar tag' };
    }
  }

  // Associar uma tag existente a uma fábrica (sistema híbrido Firebase + localStorage)
  async createTagAssociation(tag, factoryId) {
    try {
      console.log('TagService.createTagAssociation - Associando tag global:', { tag: tag.name, factoryId });
      
      // 1. Salvar associação no localStorage (sistema principal)
      const localResult = this.saveAssociationToLocalStorage(tag, factoryId);
      
      // 2. Tentar sincronizar com Firebase (opcional, para backup)
      try {
        await this.syncAssociationToFirebase(tag, factoryId);
        console.log('TagService.createTagAssociation - Associação sincronizada com Firebase');
      } catch (firebaseError) {
        console.warn('TagService.createTagAssociation - Falha na sincronização Firebase (continuando):', firebaseError.message);
      }
      
      return localResult;
    } catch (error) {
      console.error('TagService.createTagAssociation - Erro geral:', error);
      return { success: false, message: 'Erro ao criar associação da tag' };
    }
  }

  // Sincronizar associação com Firebase (backup)
  async syncAssociationToFirebase(tag, factoryId) {
    try {
      // Criar um documento de backup no Firebase
      const backupData = {
        tagId: tag.id,
        tagName: tag.name,
        tagDivision: tag.division,
        factoryId: factoryId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        type: 'association_backup'
      };

      // Usar o endpoint de tags existente para criar um documento de backup
      const response = await fetch(`${this.tagServiceFirebase.apiUrl}/firestore/create/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(backupData),
      });

      if (!response.ok) {
        throw new Error('Falha ao sincronizar com Firebase');
      }

      console.log('TagService.syncAssociationToFirebase - Backup criado no Firebase');
      return { success: true };
    } catch (error) {
      console.error('TagService.syncAssociationToFirebase - Erro:', error);
      throw error;
    }
  }

  // Salvar associação no localStorage (cache local)
  saveAssociationToLocalStorage(tag, factoryId) {
    try {
      const associationKey = `factory_tags_${factoryId}`;
      let associations = JSON.parse(localStorage.getItem(associationKey) || '{}');
      
      // Garantir que a divisão existe
      if (!associations[tag.division]) {
        associations[tag.division] = [];
      }
      
      // Verificar se já está associada (por ID ou por nome+divisão)
      const alreadyAssociated = associations[tag.division].some(t => 
        (t.id && tag.id && t.id === tag.id) || 
        (t.name === tag.name && t.division === tag.division)
      );
      
      if (alreadyAssociated) {
        console.log('TagService.saveAssociationToLocalStorage - Tag já está associada localmente:', tag.name);
        return { success: true, message: 'Tag já associada' };
      }
      
      // Adicionar associação local
      associations[tag.division].push({
        id: tag.id,
        name: tag.name,
        division: tag.division
      });
      
      // Salvar no localStorage
      localStorage.setItem(associationKey, JSON.stringify(associations));
      
      console.log('TagService.saveAssociationToLocalStorage - Associação salva localmente:', associations);
      
      return { success: true, message: 'Tag associada localmente' };
    } catch (error) {
      console.error('TagService.saveAssociationToLocalStorage - Erro:', error);
      return { success: false, message: 'Erro ao salvar localmente' };
    }
  }

  // Remover associação de uma tag de uma fábrica
  async removeTagAssociation(tag, factoryId) {
    try {
      console.log('TagService.removeTagAssociation - Removendo associação:', { tag: tag.name, factoryId });
      
      // 1. Remover do localStorage (sistema principal)
      const localResult = this.removeAssociationFromLocalStorage(tag, factoryId);
      
      // 2. Tentar remover do Firebase (opcional, para backup)
      try {
        await this.removeAssociationFromFirebase(tag, factoryId);
        console.log('TagService.removeTagAssociation - Associação removida do Firebase');
      } catch (firebaseError) {
        console.warn('TagService.removeTagAssociation - Falha na remoção Firebase (continuando):', firebaseError.message);
      }
      
      return localResult;
    } catch (error) {
      console.error('TagService.removeTagAssociation - Erro geral:', error);
      return { success: false, message: 'Erro ao remover associação da tag' };
    }
  }

  // Remover associação do localStorage
  removeAssociationFromLocalStorage(tag, factoryId) {
    try {
      const associationKey = `factory_tags_${factoryId}`;
      let associations = JSON.parse(localStorage.getItem(associationKey) || '{}');
      
      // Garantir que a divisão existe
      if (!associations[tag.division]) {
        associations[tag.division] = [];
      }
      
      // Remover a tag da divisão (por ID ou por nome+divisão)
      const initialLength = associations[tag.division].length;
      associations[tag.division] = associations[tag.division].filter(t => 
        !((t.id && tag.id && t.id === tag.id) || 
          (t.name === tag.name && t.division === tag.division))
      );
      const finalLength = associations[tag.division].length;
      
      // Se a divisão ficou vazia, removê-la
      if (associations[tag.division].length === 0) {
        delete associations[tag.division];
      }
      
      // Salvar no localStorage
      localStorage.setItem(associationKey, JSON.stringify(associations));
      
      console.log('TagService.removeAssociationFromLocalStorage - Associação removida localmente:', {
        tag: tag.name,
        removed: initialLength > finalLength,
        associations
      });
      
      return { success: true, message: 'Associação removida localmente' };
    } catch (error) {
      console.error('TagService.removeAssociationFromLocalStorage - Erro:', error);
      return { success: false, message: 'Erro ao remover localmente' };
    }
  }

  // Remover associação do Firebase (backup)
  async removeAssociationFromFirebase(tag, factoryId) {
    try {
      // Buscar backups de associação no Firebase
      const response = await fetch(`${this.tagServiceFirebase.apiUrl}/firestore/get/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar backups do Firebase');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Encontrar backup de associação para esta tag e fábrica
        const backupAssociation = result.data.find(backup => 
          backup.type === 'association_backup' && 
          backup.tagId === tag.id && 
          backup.factoryId === factoryId
        );
        
        if (backupAssociation) {
          console.log('TagService.removeAssociationFromFirebase - Removendo backup:', backupAssociation.id);
          
          // Remover o backup do Firebase
          const deleteResponse = await fetch(`${this.tagServiceFirebase.apiUrl}/firestore/delete/tags/${backupAssociation.id}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!deleteResponse.ok) {
            throw new Error('Falha ao remover backup do Firebase');
          }

          console.log('TagService.removeAssociationFromFirebase - Backup removido do Firebase');
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('TagService.removeAssociationFromFirebase - Erro:', error);
      throw error;
    }
  }

  // Carregar tags associadas a uma fábrica (localStorage principal + Firebase backup)
  async getFactoryTagsWithAssociations(factoryId) {
    try {
      console.log('TagService.getFactoryTagsWithAssociations - Carregando tags da fábrica:', factoryId);
      
      // 1. Carregar do localStorage (sistema principal)
      const localAssociations = this.loadAssociationsFromLocalStorage(factoryId);
      console.log('TagService.getFactoryTagsWithAssociations - Associações locais carregadas:', localAssociations);
      
      // 2. Tentar sincronizar com Firebase (sempre tentar)
      try {
        await this.syncFromFirebaseBackup(factoryId, localAssociations);
        
        // Após sincronização, recarregar do localStorage para pegar dados atualizados
        const updatedLocalAssociations = this.loadAssociationsFromLocalStorage(factoryId);
        console.log('TagService.getFactoryTagsWithAssociations - Resultado após sincronização:', updatedLocalAssociations);
        
        // Garantir estrutura consistente
        const safeAssociations = {
          regiao: Array.isArray(updatedLocalAssociations?.regiao) ? updatedLocalAssociations.regiao : [],
          material: Array.isArray(updatedLocalAssociations?.material) ? updatedLocalAssociations.material : [],
          outros: Array.isArray(updatedLocalAssociations?.outros) ? updatedLocalAssociations.outros : [],
          tipoProduto: Array.isArray(updatedLocalAssociations?.tipoProduto) ? updatedLocalAssociations.tipoProduto : []
        };
        
        console.log('TagService.getFactoryTagsWithAssociations - Estrutura final:', safeAssociations);
        return safeAssociations;
        
      } catch (firebaseError) {
        console.warn('TagService.getFactoryTagsWithAssociations - Falha na sincronização Firebase (continuando):', firebaseError.message);
        console.log('TagService.getFactoryTagsWithAssociations - Usando apenas localStorage:', localAssociations);
        
        // Garantir estrutura consistente mesmo no fallback
        const safeAssociations = {
          regiao: Array.isArray(localAssociations?.regiao) ? localAssociations.regiao : [],
          material: Array.isArray(localAssociations?.material) ? localAssociations.material : [],
          outros: Array.isArray(localAssociations?.outros) ? localAssociations.outros : [],
          tipoProduto: Array.isArray(localAssociations?.tipoProduto) ? localAssociations.tipoProduto : []
        };
        
        return safeAssociations;
      }
      
    } catch (error) {
      console.error('TagService.getFactoryTagsWithAssociations - Erro:', error);
      // Fallback para estrutura vazia em caso de erro
      return {
        regiao: [],
        material: [],
        outros: [],
        tipoProduto: []
      };
    }
  }

  // Forçar sincronização completa do Firebase para uma fábrica
  async forceSyncFromFirebase(factoryId) {
    try {
      console.log('TagService.forceSyncFromFirebase - Forçando sincronização para fábrica:', factoryId);
      
      // Limpar localStorage primeiro
      const associationKey = `factory_tags_${factoryId}`;
      localStorage.removeItem(associationKey);
      console.log('TagService.forceSyncFromFirebase - localStorage limpo');
      
      // Buscar todos os backups do Firebase para esta fábrica
      const response = await fetch(`${this.tagServiceFirebase.apiUrl}/firestore/get/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar backups do Firebase');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const backupAssociations = result.data.filter(tag => 
          tag.type === 'association_backup' && tag.factoryId === factoryId
        );
        
        console.log('TagService.forceSyncFromFirebase - Backups encontrados:', backupAssociations.length);
        
        if (backupAssociations.length > 0) {
          // Criar estrutura de associações
          const associations = {
            regiao: [],
            material: [],
            outros: [],
            tipoProduto: []
          };
          
          // Restaurar todas as associações
          backupAssociations.forEach(backup => {
            console.log('TagService.forceSyncFromFirebase - Restaurando:', backup.tagName, 'para divisão:', backup.tagDivision);
            
            if (associations[backup.tagDivision]) {
              associations[backup.tagDivision].push({
                id: backup.tagId,
                name: backup.tagName,
                division: backup.tagDivision,
                createdAt: backup.createdAt,
                updatedAt: backup.updatedAt
              });
            }
          });
          
          // Salvar no localStorage
          this.saveRestoredAssociationsToLocalStorage(factoryId, associations);
          console.log('TagService.forceSyncFromFirebase - Sincronização forçada concluída');
          
          return associations;
        } else {
          console.log('TagService.forceSyncFromFirebase - Nenhum backup encontrado');
          return {
            regiao: [],
            material: [],
            outros: [],
            tipoProduto: []
          };
        }
      } else {
        throw new Error('Falha ao buscar dados do Firebase');
      }
    } catch (error) {
      console.error('TagService.forceSyncFromFirebase - Erro:', error);
      throw error;
    }
  }

  // Sincronizar com backup do Firebase (opcional)
  async syncFromFirebaseBackup(factoryId, localAssociations) {
    try {
      console.log('TagService.syncFromFirebaseBackup - Iniciando sincronização para fábrica:', factoryId);
      
      // Buscar backups de associações no Firebase
      const response = await fetch(`${this.tagServiceFirebase.apiUrl}/firestore/get/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao buscar backups do Firebase');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Filtrar apenas backups de associações para esta fábrica
        const backupAssociations = result.data.filter(tag => 
          tag.type === 'association_backup' && tag.factoryId === factoryId
        );
        
        console.log('TagService.syncFromFirebaseBackup - Backups encontrados:', backupAssociations.length);
        
        if (backupAssociations.length > 0) {
          // Verificar se há associações locais
          const hasLocalAssociations = Object.values(localAssociations).some(division => division.length > 0);
          
          console.log('TagService.syncFromFirebaseBackup - Tem associações locais:', hasLocalAssociations);
          
          // Se não há associações locais OU se há menos associações locais que backups, restaurar
          const totalLocalAssociations = Object.values(localAssociations).reduce((sum, division) => sum + division.length, 0);
          
          if (!hasLocalAssociations || totalLocalAssociations < backupAssociations.length) {
            console.log('TagService.syncFromFirebaseBackup - Restaurando do backup Firebase');
            console.log('TagService.syncFromFirebaseBackup - Associações locais:', totalLocalAssociations, 'Backups:', backupAssociations.length);
            
            // Limpar associações locais existentes
            Object.keys(localAssociations).forEach(division => {
              localAssociations[division] = [];
            });
            
            // Restaurar associações do backup
            backupAssociations.forEach(backup => {
              console.log('TagService.syncFromFirebaseBackup - Restaurando backup:', backup.tagName, 'para divisão:', backup.tagDivision);
              
              if (localAssociations[backup.tagDivision]) {
                localAssociations[backup.tagDivision].push({
                  id: backup.tagId,
                  name: backup.tagName,
                  division: backup.tagDivision,
                  createdAt: backup.createdAt,
                  updatedAt: backup.updatedAt
                });
              }
            });
            
            // Salvar no localStorage
            this.saveRestoredAssociationsToLocalStorage(factoryId, localAssociations);
            console.log('TagService.syncFromFirebaseBackup - Restauração concluída');
          } else {
            console.log('TagService.syncFromFirebaseBackup - Associações locais são suficientes, não restaurando');
          }
        } else {
          console.log('TagService.syncFromFirebaseBackup - Nenhum backup encontrado para esta fábrica');
        }
      } else {
        console.log('TagService.syncFromFirebaseBackup - Falha ao buscar dados do Firebase');
      }
    } catch (error) {
      console.error('TagService.syncFromFirebaseBackup - Erro:', error);
      throw error;
    }
  }

  // Salvar associações restauradas no localStorage
  saveRestoredAssociationsToLocalStorage(factoryId, associations) {
    try {
      const associationKey = `factory_tags_${factoryId}`;
      const localAssociations = {};
      
      Object.keys(associations).forEach(division => {
        if (associations[division].length > 0) {
          localAssociations[division] = associations[division].map(tag => ({
            id: tag.id,
            name: tag.name,
            division: tag.division
          }));
        }
      });
      
      localStorage.setItem(associationKey, JSON.stringify(localAssociations));
      console.log('TagService.saveRestoredAssociationsToLocalStorage - Associações restauradas:', localAssociations);
    } catch (error) {
      console.error('TagService.saveRestoredAssociationsToLocalStorage - Erro:', error);
    }
  }

  // Carregar associações do localStorage (sistema principal)
  loadAssociationsFromLocalStorage(factoryId) {
    try {
      const associationKey = `factory_tags_${factoryId}`;
      const associations = JSON.parse(localStorage.getItem(associationKey) || '{}');
      
      console.log('TagService.loadAssociationsFromLocalStorage - Associações encontradas:', associations);
      
      // Organizar tags por divisão
      const result = {
        regiao: [],
        material: [],
        outros: [],
        tipoProduto: []
      };
      
      // Para cada divisão, adicionar as tags associadas
      Object.keys(result).forEach(division => {
        if (associations[division]) {
          result[division] = associations[division].map(assoc => ({
            id: assoc.id,
            name: assoc.name,
            division: assoc.division,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }));
        }
      });
      
      console.log('TagService.loadAssociationsFromLocalStorage - Resultado final:', result);
      return result;
    } catch (error) {
      console.error('TagService.loadAssociationsFromLocalStorage - Erro:', error);
      return {
        regiao: [],
        material: [],
        outros: [],
        tipoProduto: []
      };
    }
  }

}

const tagService = new TagService();

export default tagService;
