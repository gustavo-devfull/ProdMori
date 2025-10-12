class ImageService {
  constructor() {
    this.apiUrl = 'http://localhost:3001/api';
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
      
      // Converter URL do FTP para URL do proxy
      const filename = result.imageUrl.split('/').pop();
      const proxyUrl = `http://localhost:3001/api/image/${filename}`;
      
      return proxyUrl;

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

      // Extrair o nome do arquivo da URL (pode ser proxy ou FTP direto)
      let filename;
      if (imageUrl.includes('localhost:3001/api/image/')) {
        filename = imageUrl.split('/api/image/')[1];
      } else {
        filename = imageUrl.split('/').pop().split('?')[0];
      }

      const response = await fetch(`${this.apiUrl}/delete-image/${filename}`, {
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
      return url.includes('localhost:3001/api/image/') || url.includes('ideolog.ia.br');
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
}

const imageService = new ImageService();
export default imageService;
