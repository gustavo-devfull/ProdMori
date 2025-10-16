class CacheService {
  constructor() {
    this.dbName = 'PMR_Cache';
    this.dbVersion = 1;
    this.db = null;
    this.memoryCache = new Map();
    this.cacheDurations = {
      factories: 30 * 60 * 1000, // 30 minutos (era 5)
      tags: 60 * 60 * 1000, // 60 minutos (era 10)
      products: 15 * 60 * 1000, // 15 minutos (era 3)
      images: 2 * 60 * 60 * 1000 // 2 horas (era 30 min)
    };
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Store para factories
        if (!db.objectStoreNames.contains('factories')) {
          const factoryStore = db.createObjectStore('factories', { keyPath: 'id' });
          factoryStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para tags
        if (!db.objectStoreNames.contains('tags')) {
          const tagStore = db.createObjectStore('tags', { keyPath: 'key' });
          tagStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para products
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'key' });
          productStore.createIndex('factoryId', 'factoryId', { unique: false });
          productStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store para images
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'url' });
          imageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  // Cache em memória (mais rápido)
  getFromMemory(key) {
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheDurations[cached.type]) {
      console.log(`Cache hit (memory): ${key}`);
      return cached.data;
    }
    return null;
  }

  setInMemory(key, data, type) {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      type
    });
  }

  // Cache em IndexedDB (persistente)
  async getFromIndexedDB(storeName, key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result && this.isCacheValid(result, storeName)) {
          console.log(`Cache hit (IndexedDB): ${key}`);
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async setInIndexedDB(storeName, key, data, type) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Criar objeto com key como propriedade principal
      const cacheItem = {
        key: key,
        data: data,
        timestamp: Date.now(),
        type: type
      };
      
      const request = store.put(cacheItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Verificar se cache é válido
  isCacheValid(cachedItem, type) {
    const duration = this.cacheDurations[type] || 5 * 60 * 1000;
    return Date.now() - cachedItem.timestamp < duration;
  }

  // Método principal para buscar dados
  async get(key, type, fetchFunction) {
    // 1. Tentar cache em memória primeiro
    let data = this.getFromMemory(key);
    if (data) return data;

    // 2. Tentar cache em localStorage (fallback simples)
    try {
      const cachedData = localStorage.getItem(`cache_${key}`);
      const cacheTime = localStorage.getItem(`cache_time_${key}`);
      
      if (cachedData && cacheTime && this.isCacheValid({ timestamp: parseInt(cacheTime) }, type)) {
        console.log(`Cache hit (localStorage): ${key}`);
        data = JSON.parse(cachedData);
        this.setInMemory(key, data, type);
        return data;
      }
    } catch (error) {
      console.warn('Erro ao ler cache do localStorage:', error);
    }

    // 3. Buscar dados frescos
    console.log(`Cache miss: ${key}, fetching fresh data`);
    try {
      data = await fetchFunction();
      
      // Salvar em cache em memória e localStorage
      this.setInMemory(key, data, type);
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(data));
        localStorage.setItem(`cache_time_${key}`, Date.now().toString());
      } catch (storageError) {
        console.warn('Erro ao salvar no localStorage:', storageError);
      }
      
      return data;
    } catch (error) {
      console.error(`Error fetching data for ${key}:`, error);
      throw error;
    }
  }

  // Invalidar cache específico
  async invalidate(key, type) {
    // Remover da memória
    this.memoryCache.delete(key);
    
    // Remover do IndexedDB
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([type], 'readwrite');
      const store = transaction.objectStore(type);
      const request = store.delete(key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Limpar cache expirado
  async cleanExpiredCache() {
    await this.init();
    const stores = ['factories', 'tags', 'products', 'images'];
    
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const index = store.index('timestamp');
      const request = index.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (!this.isCacheValid(cursor.value, storeName)) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }
  }

  // Limpar todo o cache
  async clearAll() {
    this.memoryCache.clear();
    await this.init();
    
    const stores = ['factories', 'tags', 'products', 'images'];
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // Estatísticas do cache
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys())
    };
  }
}

// Instância singleton
const cacheService = new CacheService();

export default cacheService;
