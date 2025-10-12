class ImageService {
  constructor() {
    // Detectar se está rodando no Vercel ou localmente
    this.isVercel = typeof window !== 'undefined' && 
      (window.location.hostname.includes('vercel.app') || 
       window.location.hostname.includes('vercel.com'));
    
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

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Arquivo muito grande. Máximo 5MB permitido.');
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
      new URL(url);
      return url.includes('ideolog.ia.br') || 
             url.includes('localhost:3001/api/image') ||
             url.includes('/api/image');
    } catch {
      return false;
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

  // Método para obter URL de imagem otimizada
  getImageUrl(imageUrl) {
    if (!imageUrl) return null;
    
    // Se já é uma URL válida, retornar como está
    if (this.isValidImageUrl(imageUrl)) {
      return imageUrl;
    }
    
    // Se é um nome de arquivo, construir URL
    if (this.isVercel) {
      return `https://ideolog.ia.br/${imageUrl}`;
    } else {
      return `${this.apiUrl}/image?filename=${imageUrl}`;
    }
  }
}

const imageService = new ImageService();
export default imageService;