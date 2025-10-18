import firebasePersistence from '../utils/firebasePersistence';

class ProductServiceAPI {
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

  // Detectar se é mobile
  isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  }

  async createProduct(productData) {
    try {
      console.log('ProductServiceAPI.createProduct - Dados recebidos:', productData);
      
      // Remover campos undefined/vazios
      const cleanData = Object.fromEntries(
        Object.entries(productData).filter(([key, value]) => 
          value !== undefined && value !== null && value !== ''
        )
      );
      
      console.log('ProductServiceAPI.createProduct - Dados limpos:', cleanData);
      console.log('ProductServiceAPI.createProduct - audioUrl original:', productData.audioUrl);
      console.log('ProductServiceAPI.createProduct - audioUrl limpo:', cleanData.audioUrl);

      const response = await fetch(`${this.apiUrl}/firestore/create/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar produto');
      }

      const result = await response.json();
      return { id: result.id, ...cleanData };
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      throw error;
    }
  }

  async getAllProducts() {
    try {
      console.log('🔥 Forçando dados frescos do Firebase para produtos...');
      
      // Usar estratégia mais agressiva de persistência
      const url = `${this.apiUrl}/firestore/products-with-factory?limit=100`;
      
      const result = await firebasePersistence.forceFirebaseData(url, {
        method: 'GET'
      });

      console.log('✅ Produtos carregados do Firebase:', result.data?.length || 0);

      const products = result.data.map(product => {
        // Converter preço para número se existir
        if (product.price && typeof product.price === 'string') {
          product.price = parseFloat(product.price);
        }
        return product;
      });
      
      console.log('✅ Produtos processados:', products);
      return products;
    } catch (error) {
      console.error('❌ Erro ao buscar produtos do Firebase:', error);
      throw error;
    }
  }

  async updateProduct(id, productData) {
    try {
      // Remover campos undefined/vazios
      const cleanData = Object.fromEntries(
        Object.entries(productData).filter(([key, value]) => 
          value !== undefined && value !== null && value !== ''
        )
      );

      const response = await fetch(`${this.apiUrl}/firestore/update/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar produto');
      }

      return { id, ...cleanData };
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  }

  async deleteProduct(id) {
    try {
      console.log('ProductServiceAPI.deleteProduct - Tentando excluir produto:', id);
      console.log('ProductServiceAPI.deleteProduct - URL:', `${this.apiUrl}/firestore/delete/products/${id}`);
      
      const response = await fetch(`${this.apiUrl}/firestore/delete/products/${id}`, {
        method: 'DELETE',
      });

      console.log('ProductServiceAPI.deleteProduct - Response status:', response.status);
      console.log('ProductServiceAPI.deleteProduct - Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('ProductServiceAPI.deleteProduct - Erro na resposta:', errorData);
        throw new Error(errorData.error || 'Erro ao deletar produto');
      }

      const result = await response.json();
      console.log('ProductServiceAPI.deleteProduct - Sucesso:', result);
      return true;
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      throw error;
    }
  }

  async getProductById(id) {
    try {
      const response = await fetch(`${this.apiUrl}/firestore/get/products/${id}`, {
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar produto');
      }

      const result = await response.json();
      
      if (!result.ok) {
        throw new Error(result.error || 'Erro na resposta da API');
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao buscar produto por ID:', error);
      throw error;
    }
  }

  async uploadProductImage(file) {
    try {
      // Validar o arquivo
      if (!file) {
        throw new Error('Nenhum arquivo fornecido');
      }

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        throw new Error('Apenas arquivos de imagem são permitidos');
      }

      // Validar tamanho (máximo 25MB)
      if (file.size > 25 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo 25MB permitido.');
      }

      // Criar FormData para envio
      const formData = new FormData();
      formData.append('image', file);

      // Fazer upload via API
      const response = await fetch(`${this.apiUrl}/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no upload');
      }

      const result = await response.json();
      console.log('Upload realizado com sucesso:', result.imageUrl);
      
      // Para Vercel, usar URL direta do FTP
      // Para local, usar proxy
      if (this.isVercel) {
        return result.imageUrl; // URL direta do FTP
      } else {
        // Converter URL do FTP para URL do proxy local
        const filename = result.imageUrl.split('/').pop();
        return `${this.apiUrl}/image/${filename}`;
      }

    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw new Error(`Erro no upload: ${error.message}`);
    }
  }

  async getFactoryById(factoryId) {
    try {
      const response = await fetch(`${this.apiUrl}/firestore/get/factories/${factoryId}`, {
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

const productServiceAPI = new ProductServiceAPI();
export default productServiceAPI;
