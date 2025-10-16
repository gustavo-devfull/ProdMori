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
    
    console.log('ImageService initialized:', {
      isVercel: this.isVercel,
      apiUrl: this.apiUrl,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'server'
    });
  }

  async uploadFile(file) {
    // Criar AbortController para timeout (fora do try para estar disponível no catch)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos
    
    try {
      console.log('ImageService.uploadFile - Iniciando upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        apiUrl: this.apiUrl
      });

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

      console.log('ImageService.uploadFile - Enviando requisição para:', `${this.apiUrl}/upload-image`);

      // Fazer upload via API com timeout
      const response = await fetch(`${this.apiUrl}/upload-image`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          // Não definir Content-Type, deixar o browser definir com boundary
        }
      });

      clearTimeout(timeoutId);

      console.log('ImageService.uploadFile - Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        let errorData;
        try {
          const responseText = await response.text();
          console.log('ImageService.uploadFile - Resposta de erro (texto):', responseText);
          
          if (responseText) {
            errorData = JSON.parse(responseText);
          } else {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (parseError) {
          console.error('ImageService.uploadFile - Erro ao fazer parse da resposta:', parseError);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        throw new Error(errorData.error || 'Erro no upload');
      }

      const responseText = await response.text();
      console.log('ImageService.uploadFile - Resposta de sucesso (texto):', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('ImageService.uploadFile - Erro ao fazer parse da resposta de sucesso:', parseError);
        throw new Error('Resposta inválida do servidor');
      }

      console.log('ImageService.uploadFile - Upload realizado com sucesso:', result.imageUrl);
      
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
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('ImageService.uploadFile - Timeout no upload:', error);
        throw new Error('Timeout no upload da imagem. Tente novamente.');
      }
      
      console.error('ImageService.uploadFile - Erro ao fazer upload da imagem:', error);
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
      
      const cleanUrl = url.trim();
      
      // Validar formato básico antes de tentar construir URL
      if (cleanUrl.length < 5 || (!cleanUrl.includes('.') && !cleanUrl.startsWith('/'))) {
        return false;
      }
      
      // Se é uma URL relativa, considerar válida se começar com /api/image
      if (cleanUrl.startsWith('/api/image')) {
        return true;
      }
      
      // Para URLs absolutas, tentar construir URL
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        new URL(cleanUrl);
        return cleanUrl.includes('ideolog.ia.br') || 
               cleanUrl.includes('localhost:3001/api/image') ||
               cleanUrl.includes('/api/image');
      }
      
      return false;
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

  // Método para testar URLs de imagens
  async testImageUrls(imageUrls) {
    const results = [];
    
    for (const url of imageUrls) {
      try {
        console.log('ImageService.testImageUrls - Testing URL:', url);
        
        const processedUrl = this.getImageUrl(url);
        console.log('ImageService.testImageUrls - Processed URL:', processedUrl);
        
        if (!processedUrl) {
          results.push({ url, processedUrl: null, status: 'invalid', error: 'URL inválida' });
          continue;
        }
        
        // Testar se a imagem carrega
        const response = await fetch(processedUrl, { method: 'HEAD' });
        const status = response.ok ? 'ok' : 'error';
        const error = response.ok ? null : `HTTP ${response.status}: ${response.statusText}`;
        
        results.push({ url, processedUrl, status, error });
        console.log('ImageService.testImageUrls - Result:', { url, processedUrl, status, error });
        
      } catch (error) {
        console.error('ImageService.testImageUrls - Error testing URL:', url, error);
        results.push({ url, processedUrl: null, status: 'error', error: error.message });
      }
    }
    
    return results;
  }

  // Método para obter URL de imagem otimizada
  getImageUrl(imageUrl) {
    console.log('ImageService.getImageUrl - Input:', imageUrl, 'Type:', typeof imageUrl);
    console.log('ImageService.getImageUrl - Environment:', {
      isVercel: this.isVercel,
      apiUrl: this.apiUrl,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'server'
    });
    
    // Validar entrada mais rigorosamente
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      console.log('ImageService.getImageUrl - Returning null (empty/invalid input)');
      return null;
    }
    
    // Limpar a URL de espaços e caracteres inválidos
    const cleanUrl = imageUrl.trim();
    if (cleanUrl === '') {
      console.log('ImageService.getImageUrl - Returning null (empty after trim)');
      return null;
    }
    
    // Verificar se contém caracteres perigosos que podem quebrar o construtor URL
    if (cleanUrl.includes('\n') || cleanUrl.includes('\r') || cleanUrl.includes('\t')) {
      console.log('ImageService.getImageUrl - Returning null (contains dangerous characters)');
      return null;
    }
    
    try {
      // Se já é uma URL completa e válida, retornar diretamente
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        try {
          // Validar se a URL tem formato básico válido antes de tentar construir
          if (cleanUrl.length < 10 || !cleanUrl.includes('.')) {
            console.log('ImageService.getImageUrl - URL muito curta ou sem domínio:', cleanUrl);
            return null;
          }
          
          // Tentar construir URL para validar
          new URL(cleanUrl);
          console.log('ImageService.getImageUrl - Using complete URL:', cleanUrl);
          return cleanUrl;
        } catch (urlError) {
          console.error('URL completa inválida:', cleanUrl, urlError);
          // Se a URL é inválida mas parece ser uma URL de imagem, tentar corrigir
          if (cleanUrl.includes('.jpg') || cleanUrl.includes('.jpeg') || cleanUrl.includes('.png') || cleanUrl.includes('.gif')) {
            console.log('ImageService.getImageUrl - Attempting to fix URL:', cleanUrl);
            // Tentar usar encodeURI para corrigir caracteres especiais
            try {
              const fixedUrl = encodeURI(cleanUrl);
              new URL(fixedUrl);
              console.log('ImageService.getImageUrl - Fixed URL:', fixedUrl);
              return fixedUrl;
            } catch (fixError) {
              console.error('Não foi possível corrigir a URL:', cleanUrl, fixError);
              return null;
            }
          }
          return null;
        }
      }
      
      // Se já é uma URL relativa válida, retornar diretamente
      if (cleanUrl.startsWith('/api/image/') || cleanUrl.startsWith('/api/image?')) {
        console.log('ImageService.getImageUrl - Using relative URL:', cleanUrl);
        return cleanUrl;
      }
      
      // Se é um nome de arquivo, construir URL
      let constructedUrl;
      if (this.isVercel) {
        // Para Vercel, usar URL relativa para a própria API
        constructedUrl = `/api/image/${cleanUrl}`;
      } else {
        // Para desenvolvimento local, usar URL completa
        constructedUrl = `${this.apiUrl}/image/${cleanUrl}`;
      }
      
      // Validar se a URL construída é válida
      if (constructedUrl.startsWith('/')) {
        // URL relativa - válida para uso direto
        console.log('ImageService.getImageUrl - Using constructed relative URL:', constructedUrl);
        return constructedUrl;
      } else if (constructedUrl.startsWith('http://') || constructedUrl.startsWith('https://')) {
        // URL absoluta - validar com construtor URL
        try {
          // Validar formato básico antes de tentar construir URL
          if (constructedUrl.length < 15 || !constructedUrl.includes('.')) {
            console.log('ImageService.getImageUrl - URL construída muito curta ou sem domínio:', constructedUrl);
            return null;
          }
          
          new URL(constructedUrl);
          console.log('ImageService.getImageUrl - Using constructed absolute URL:', constructedUrl);
          return constructedUrl;
        } catch (urlError) {
          console.error('URL absoluta construída inválida:', constructedUrl, urlError);
          return null;
        }
      } else {
        // URL malformada
        console.error('URL malformada:', constructedUrl);
        return null;
      }
    } catch (error) {
      console.error('Erro ao construir URL da imagem:', error, 'imageUrl:', cleanUrl);
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
  // Método para testar upload com arquivo de teste
  async testUpload() {
    try {
      console.log('ImageService.testUpload - Iniciando teste de upload...');
      
      // Criar um arquivo de teste (1x1 pixel PNG)
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 1, 1);
      
      return new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          try {
            const testFile = new File([blob], 'test-image.png', { type: 'image/png' });
            console.log('ImageService.testUpload - Arquivo de teste criado:', testFile);
            
            const result = await this.uploadFile(testFile);
            console.log('ImageService.testUpload - Upload de teste bem-sucedido:', result);
            resolve(result);
          } catch (error) {
            console.error('ImageService.testUpload - Erro no upload de teste:', error);
            reject(error);
          }
        }, 'image/png');
      });
    } catch (error) {
      console.error('ImageService.testUpload - Erro ao criar arquivo de teste:', error);
      throw error;
    }
  }

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