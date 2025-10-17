import cacheService from './cacheService';

class OptimizedFirebaseService {
  constructor() {
    this.isVercel = typeof window !== 'undefined' && 
      (window.location.protocol === 'https:' || 
       window.location.hostname.includes('vercel.app') || 
       window.location.hostname.includes('vercel.com') ||
       window.location.hostname.includes('gpreto.space') ||
       window.location.hostname !== 'localhost');
    
    this.apiUrl = this.isVercel ? '/api' : 'http://localhost:3001/api';
    this.pageSize = 20; // Tamanho da página para paginação
    this.batchSize = 5; // Tamanho do batch para consultas agrupadas
  }

  // Busca direta sem cache
  async fetchPaginatedDataDirectly(collection, options = {}) {
    const {
      page = 1,
      limit = this.pageSize,
      orderBy = 'createdAt',
      orderDirection = 'desc',
      filters = {}
    } = options;

    const params = new URLSearchParams({
      col: collection,
      page: page.toString(),
      limit: limit.toString(),
      orderBy,
      orderDirection
    });

    // Adicionar filtros
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params.append(key, value);
      }
    });

    const response = await fetch(`${this.apiUrl}/firestore/get/paginated?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    const result = await response.json();
    
    if (!response.ok || result.fallback || result.error) {
      console.log('Firebase indisponível na busca direta, usando localStorage');
      return this.getFactoriesFromLocalStorage(page, limit);
    }

    return result;
  }

  // Consulta otimizada com paginação
  async getPaginatedData(collection, options = {}) {
    const {
      page = 1,
      limit = this.pageSize,
      orderBy = 'createdAt',
      orderDirection = 'desc',
      filters = {},
      cacheKey = null,
      forceRefresh = false
    } = options;

    // Se forçar refresh, usar busca direta
    if (forceRefresh) {
      console.log('Forçando busca direta sem cache para:', collection);
      return await this.fetchPaginatedDataDirectly(collection, options);
    }

    const cacheKeyFinal = cacheKey || `${collection}_page_${page}_limit_${limit}_${JSON.stringify(filters)}`;
    
    return await cacheService.get(cacheKeyFinal, collection, async () => {
      const params = new URLSearchParams({
        col: collection,
        page: page.toString(),
        limit: limit.toString(),
        orderBy,
        orderDirection
      });

      // Adicionar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, value);
        }
      });

      const response = await fetch(`${this.apiUrl}/firestore/get/paginated?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      // Se houver erro de quota ou Firebase indisponível, usar fallback
      if (!response.ok || result.fallback || result.error) {
        console.log('Firebase indisponível, usando fallback:', result.error);
        return {
          success: true,
          data: [],
          pagination: { page: page, limit: limit, total: 0, pages: 0 },
          fallback: true
        };
      }

      return result;
    });
  }

  // Consulta agrupada para múltiplas coleções
  async getBatchData(requests) {
    const batchKey = `batch_${requests.map(r => `${r.collection}_${r.id}`).join('_')}`;
    
    return await cacheService.get(batchKey, 'batch', async () => {
      const promises = requests.map(async (request) => {
        try {
          const data = await this.getPaginatedData(request.collection, {
            ...request.options,
            cacheKey: `${request.collection}_${request.id}`
          });
          return { id: request.id, data, success: true };
        } catch (error) {
          console.error(`Error fetching ${request.collection}:`, error);
          return { id: request.id, data: null, success: false, error: error.message };
        }
      });

      return await Promise.all(promises);
    });
  }

  // Buscar fábricas com paginação
  async getFactories(page = 1, limit = this.pageSize, filters = {}) {
    return await this.getPaginatedData('factories', {
      page,
      limit,
      filters,
      cacheKey: `factories_page_${page}_${JSON.stringify(filters)}`
    });
  }

  // Buscar produtos de uma fábrica com paginação
  async getFactoryProducts(factoryId, page = 1, limit = this.pageSize) {
    return await this.getPaginatedData('products', {
      page,
      limit,
      filters: { factoryId },
      cacheKey: `products_factory_${factoryId}_page_${page}`
    });
  }

  // Buscar tags com filtros otimizados
  async getTags(factoryId = null, division = null, limit = 100) {
    const cacheKey = `tags_${factoryId || 'global'}_${division || 'all'}`;
    
    return await cacheService.get(cacheKey, 'tags', async () => {
      // Primeiro tentar localStorage antes de fazer requisição
      const localTags = this.getTagsFromLocalStorage(factoryId, division);
      if (localTags.length > 0) {
        console.log('Usando tags do localStorage para evitar consulta Firebase');
        return localTags;
      }
      
      const params = new URLSearchParams();
      if (factoryId) params.append('factoryId', factoryId);
      if (division) params.append('division', division);
      params.append('limit', limit.toString());

      const response = await fetch(`${this.apiUrl}/firestore/get/tags?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      if (!response.ok || result.fallback || result.error) {
        console.log('Firebase indisponível, usando localStorage');
        return this.getTagsFromLocalStorage(factoryId, division);
      }

      // Processar tags do Firebase - extrair tagData e remover duplicatas
      const processedTags = [];
      const seenTags = new Set();
      
      if (result.data && Array.isArray(result.data)) {
        result.data.forEach(tag => {
          if (tag.tagData) {
            const tagKey = `${tag.tagData.name}_${tag.tagData.division}`;
            if (!seenTags.has(tagKey)) {
              seenTags.add(tagKey);
              processedTags.push({
                id: tag.tagData.id,
                name: tag.tagData.name,
                division: tag.tagData.division,
                createdAt: tag.tagData.createdAt,
                factoryId: tag.factoryId
              });
            }
          }
        });
      }
      
      console.log('OptimizedFirebaseService - Tags processadas:', processedTags.length);
      return processedTags;
    });
  }

  // Fallback para localStorage
  getTagsFromLocalStorage(factoryId = null, division = null) {
    try {
      let tags = [];
      
      if (factoryId) {
        const savedTags = localStorage.getItem(`tags_${factoryId}`);
        if (savedTags) {
          const factoryTags = JSON.parse(savedTags);
          tags = [
            ...(factoryTags.regiao || []),
            ...(factoryTags.material || []),
            ...(factoryTags.outros || [])
          ];
        }
      } else {
        const globalTags = localStorage.getItem('globalTags');
        if (globalTags) {
          const parsedGlobalTags = JSON.parse(globalTags);
          tags = [
            ...(parsedGlobalTags.regiao || []),
            ...(parsedGlobalTags.material || []),
            ...(parsedGlobalTags.outros || [])
          ];
        }
      }
      
      if (division) {
        tags = tags.filter(tag => tag.division === division);
      }
      
      return tags;
    } catch (error) {
      console.error('Erro ao buscar tags do localStorage:', error);
      return [];
    }
  }

  // Buscar dados iniciais do dashboard (otimizado)
  async getDashboardData() {
    const cacheKey = 'dashboard_initial_data';
    
    return await cacheService.get(cacheKey, 'dashboard', async () => {
      // Buscar dados em paralelo
      const [factoriesResult, tagsResult] = await Promise.allSettled([
        this.getFactories(1, 50), // Primeira página com mais itens
        this.getTags(null, null, 200) // Todas as tags globais
      ]);

      return {
        factories: factoriesResult.status === 'fulfilled' ? factoriesResult.value.data : [],
        tags: tagsResult.status === 'fulfilled' ? tagsResult.value : [],
        errors: {
          factories: factoriesResult.status === 'rejected' ? factoriesResult.reason : null,
          tags: tagsResult.status === 'rejected' ? tagsResult.reason : null
        }
      };
    });
  }

  // Buscar dados de uma fábrica específica (otimizado)
  async getFactoryData(factoryId) {
    const cacheKey = `factory_data_${factoryId}`;
    
    return await cacheService.get(cacheKey, 'factory', async () => {
      const requests = [
        { id: 'factory', collection: 'factories', options: { filters: { id: factoryId } } },
        { id: 'products', collection: 'products', options: { filters: { factoryId } } },
        { id: 'tags', collection: 'tags', options: { filters: { factoryId } } }
      ];

      const results = await this.getBatchData(requests);
      
      return {
        factory: results.find(r => r.id === 'factory')?.data?.data?.[0] || null,
        products: results.find(r => r.id === 'products')?.data?.data || [],
        tags: results.find(r => r.id === 'tags')?.data || []
      };
    });
  }

  // Invalidar cache quando dados são atualizados
  async invalidateCache(type, key = null) {
    if (key) {
      await cacheService.invalidate(key, type);
    } else {
      // Invalidar todo o cache do tipo
      await cacheService.clearAll();
    }
  }

  // Limpar cache expirado periodicamente
  async cleanupExpiredCache() {
    await cacheService.cleanExpiredCache();
  }
}

// Instância singleton
const optimizedFirebaseService = new OptimizedFirebaseService();

export default optimizedFirebaseService;
