class AudioUploadService {
  constructor() {
    this.isVercel = typeof window !== 'undefined' && 
      (window.location.protocol === 'https:' || 
       window.location.hostname.includes('vercel.app') || 
       window.location.hostname.includes('vercel.com') ||
       window.location.hostname.includes('gpreto.space') ||
       window.location.hostname !== 'localhost');
    
    this.apiUrl = this.isVercel 
      ? '/api'  // Vercel Functions
      : 'http://localhost:3001/api';  // Servidor local
  }

  // Gerar nome de arquivo único
  generateFileName(mimeType) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    // Determinar extensão baseada no MIME type
    let extension = 'webm';
    if (mimeType.includes('mpeg')) extension = 'mp3';  // MP3 primeiro
    if (mimeType.includes('mp4')) extension = 'm4a';
    if (mimeType.includes('ogg')) extension = 'ogg';
    if (mimeType.includes('wav')) extension = 'wav';
    
    return `audio_${timestamp}_${random}.${extension}`;
  }

  // Converter URL do FTP para URL do proxy
  convertToProxyUrl(ftpUrl) {
    if (!ftpUrl) return null;
    
    // Extrair nome do arquivo da URL do FTP
    // Ex: https://ideolog.ia.br/audio/audio_1760580747344_qpqk4a.m4a
    const filename = ftpUrl.split('/').pop();
    
    if (!filename) return ftpUrl; // Fallback para URL original
    
    // Retornar URL do proxy
    return `${this.apiUrl}/audio?filename=${encodeURIComponent(filename)}`;
  }

  // Upload de áudio via API
  async uploadAudio(audioBlob, productId) {
    try {
      console.log('AudioUploadService.uploadAudio - Iniciando upload:', {
        blobSize: audioBlob.size,
        blobType: audioBlob.type,
        productId: productId,
        apiUrl: this.apiUrl
      });

      if (!audioBlob) {
        throw new Error('Nenhum arquivo de áudio fornecido');
      }

      if (!audioBlob.type.startsWith('audio/')) {
        throw new Error('Apenas arquivos de áudio são permitidos');
      }

      if (audioBlob.size > 50 * 1024 * 1024) { // 50MB
        throw new Error('Arquivo muito grande. Máximo 50MB permitido.');
      }

      const fileName = this.generateFileName(audioBlob.type);
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('productId', productId);
      formData.append('fileName', fileName);

      console.log('AudioUploadService.uploadAudio - Enviando requisição para:', `${this.apiUrl}/upload-audio`);

      const response = await fetch(`${this.apiUrl}/upload-audio`, {
        method: 'POST',
        body: formData,
        headers: {} // Let browser define Content-Type with boundary
      });

      console.log('AudioUploadService.uploadAudio - Resposta recebida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorData;
        try {
          const responseText = await response.text();
          console.log('AudioUploadService.uploadAudio - Resposta de erro (texto):', responseText);
          if (responseText) {
            errorData = JSON.parse(responseText);
          } else {
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
          }
        } catch (parseError) {
          console.error('AudioUploadService.uploadAudio - Erro ao fazer parse da resposta:', parseError);
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || 'Erro no upload');
      }

      const responseText = await response.text();
      console.log('AudioUploadService.uploadAudio - Resposta de sucesso (texto):', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('AudioUploadService.uploadAudio - Erro ao fazer parse da resposta de sucesso:', parseError);
        throw new Error('Resposta inválida do servidor');
      }

      console.log('AudioUploadService.uploadAudio - Upload realizado com sucesso:', result);
      
      // Converter URL do FTP para URL do proxy
      const proxyUrl = this.convertToProxyUrl(result.audioUrl);
      console.log('AudioUploadService.uploadAudio - URL convertida:', { original: result.audioUrl, proxy: proxyUrl });
      
      return {
        success: true,
        audioUrl: proxyUrl, // Usar URL do proxy em vez da URL do FTP
        fileName: result.fileName,
        duration: result.duration
      };

    } catch (error) {
      console.error('AudioUploadService.uploadAudio - Erro ao fazer upload do áudio:', error);
      throw new Error(`Erro no upload: ${error.message}`);
    }
  }

  // Obter URL do áudio
  getAudioUrl(fileName) {
    if (this.isVercel) {
      return `https://gpreto.space/uploads/audio/${fileName}`;
    } else {
      return `${this.apiUrl}/audio?filename=${fileName}`;
    }
  }

  // Testar upload de áudio
  async testUpload() {
    try {
      console.log('AudioUploadService.testUpload - Testando upload...');
      
      // Criar um blob de áudio de teste (silêncio)
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const sampleRate = 44100;
      const duration = 1; // 1 segundo
      const length = sampleRate * duration;
      
      const buffer = audioContext.createBuffer(1, length, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      // Preencher com silêncio
      for (let i = 0; i < length; i++) {
        channelData[i] = 0;
      }
      
      // Converter para blob (simulado)
      const testBlob = new Blob(['test audio data'], { type: 'audio/webm' });
      
      const result = await this.uploadAudio(testBlob, 'test');
      console.log('AudioUploadService.testUpload - Upload de teste bem-sucedido:', result);
      
      return result;
    } catch (error) {
      console.error('AudioUploadService.testUpload - Erro no upload de teste:', error);
      throw error;
    }
  }
}

const audioUploadService = new AudioUploadService();
export default audioUploadService;
