class ImageService {
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

  async uploadFile(file) {
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
        return `${this.apiUrl}/image?filename=${filename}`;
      }

    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw new Error(`Erro no upload: ${error.message}`);
    }
  }

  async deleteFile(imageUrl) {
    try {
      if (!imageUrl) {
        throw new Error('URL da imagem não fornecida');
      }

      // Extrair o nome do arquivo da URL
      let filename;
      if (imageUrl.includes('/api/image?filename=')) {
        filename = imageUrl.split('filename=')[1];
      } else if (imageUrl.includes('ideolog.ia.br/')) {
        filename = imageUrl.split('ideolog.ia.br/')[1];
      } else {
        filename = imageUrl.split('/').pop().split('?')[0];
      }

      const response = await fetch(`${this.apiUrl}/delete-image?filename=${filename}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar imagem');
      }

      console.log('Imagem deletada com sucesso:', filename);
      return true;

    } catch (error) {
      console.error('Erro ao deletar imagem:', error);
      throw new Error(`Erro ao deletar: ${error.message}`);
    }
  }

  generateFileName(originalName) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    return `product_${timestamp}_${randomString}.${extension}`;
  }

  // Método para validar URL de imagem
  isValidImageUrl(url) {
    try {
      if (!url || typeof url !== 'string' || url.trim() === '') {
        return false;
      }
      new URL(url);
      return url.includes('ideolog.ia.br') || 
             url.includes('localhost:3001/api/image') ||
             url.includes('/api/image');
    } catch {
      return false;
    }
  }

  // Método para normalizar URL de imagem
  normalizeImageUrl(url) {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return null;
    }
    
    // Se já é uma URL válida, verificar se precisa normalizar
    if (this.isValidImageUrl(url)) {
      // Se tem query parameter, converter para path parameter
      if (url.includes('/api/image?filename=')) {
        const filename = url.split('filename=')[1];
        return `${this.apiUrl}/image/${filename}`;
      }
      return url;
    }
    
    return null;
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

  // Método para obter URL de imagem otimizada
  getImageUrl(imageUrl) {
    console.log('ImageService.getImageUrl - Input:', imageUrl);
    
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      console.log('ImageService.getImageUrl - Returning null (empty/invalid input)');
      return null;
    }
    
    try {
      // Primeiro, tentar normalizar a URL se já for válida
      const normalizedUrl = this.normalizeImageUrl(imageUrl);
      if (normalizedUrl) {
        console.log('ImageService.getImageUrl - Using normalized URL:', normalizedUrl);
        return normalizedUrl;
      }
      
      // Se é um nome de arquivo, construir URL
      let constructedUrl;
      if (this.isVercel) {
        // Para Vercel, usar URL relativa para a própria API
        if (imageUrl.startsWith('/api/image/')) {
          constructedUrl = imageUrl; // Usar URL relativa
        } else {
          constructedUrl = `/api/image/${imageUrl}`; // URL relativa
        }
      } else {
        // Para desenvolvimento local, usar URL completa
        if (imageUrl.startsWith('/api/image/')) {
          constructedUrl = `${this.apiUrl}${imageUrl}`;
        } else {
          constructedUrl = `${this.apiUrl}/image/${imageUrl}`;
        }
      }
      
      // Validar se a URL construída é válida
      if (constructedUrl.startsWith('/')) {
        // URL relativa - válida para uso direto
        console.log('ImageService.getImageUrl - Using relative URL:', constructedUrl);
        return constructedUrl;
      } else if (constructedUrl.startsWith('http://') || constructedUrl.startsWith('https://')) {
        // URL absoluta - validar com construtor URL
        try {
          new URL(constructedUrl);
          console.log('ImageService.getImageUrl - Using absolute URL:', constructedUrl);
          return constructedUrl;
        } catch (urlError) {
          console.error('URL absoluta inválida:', constructedUrl, urlError);
          return null;
        }
      } else {
        // URL malformada
        console.error('URL malformada:', constructedUrl);
        return null;
      }
    } catch (error) {
      console.error('Erro ao construir URL da imagem:', error, 'imageUrl:', imageUrl);
      return null;
    }
  }

  // Método para pré-carregar imagens
  async preloadImage(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  // Método para verificar se a imagem existe no servidor
  async checkImageExists(imageUrl) {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('Erro ao verificar imagem:', error);
      return false;
    }
  }
}

const imageService = new ImageService();
export default imageService;