import React, { useState, useRef } from 'react';
import { Button, Card, ListGroup, Badge } from 'react-bootstrap';
import { useLanguage } from '../contexts/LanguageContext';

const AudioPlayer = ({ audioUrls = [], onDelete, disabled = false }) => {
  const { t } = useLanguage();
  const [playingIndex, setPlayingIndex] = useState(null);
  const [audioErrors, setAudioErrors] = useState({});
  const [loadingIndex, setLoadingIndex] = useState(null);
  const audioRefs = useRef({});

  // Detectar iOS
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };


  const handlePlay = async (index, url) => {
    console.log(`=== TENTATIVA DE REPRODUÇÃO ${index} ===`);
    console.log('URL:', url);
    console.log('iOS detectado:', isIOS());
    console.log('User Agent:', navigator.userAgent);
    
    // Pausar todos os outros áudios
    Object.values(audioRefs.current).forEach(audio => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    const audio = audioRefs.current[index];
    if (audio) {
      try {
        if (playingIndex === index && !audio.paused) {
          audio.pause();
          setPlayingIndex(null);
          setLoadingIndex(null);
        } else {
          // Verificar se o áudio pode ser reproduzido
          console.log(`Tentando reproduzir áudio ${index}:`, url);
          
          // Mostrar indicador de carregamento
          setLoadingIndex(index);
          setAudioErrors(prev => ({ ...prev, [index]: null }));
          
                   // Para iOS, aguardar mais tempo e verificar se o áudio está carregado
                   if (isIOS()) {
                     console.log('iOS detectado - aplicando configurações específicas');
                     
                     // Aguardar mais tempo no iOS
                     await new Promise(resolve => setTimeout(resolve, 500));
                     
                     // Verificar se o áudio está carregado com timeout
                     if (audio.readyState < 2) {
                       console.log('Áudio ainda não carregado, aguardando com timeout...');
                       await new Promise((resolve, reject) => {
                         let attempts = 0;
                         const maxAttempts = 20; // 2 segundos máximo
                         
                         const checkReady = () => {
                           attempts++;
                           console.log(`Tentativa ${attempts}/${maxAttempts} - readyState: ${audio.readyState}`);
                           
                           if (audio.readyState >= 2) {
                             console.log('Áudio carregado com sucesso!');
                             resolve();
                           } else if (attempts >= maxAttempts) {
                             console.log('Timeout: áudio não carregou em tempo hábil');
                             reject(new Error('Timeout de carregamento'));
                           } else {
                             setTimeout(checkReady, 100);
                           }
                         };
                         checkReady();
                       });
                     }
                     
                     // Definir volume para iOS
                     audio.volume = 1.0;
                     
                     // Forçar carregamento no iOS
                     audio.load();
                   } else {
                     // Aguardar um pouco antes de tentar reproduzir para evitar AbortError
                     await new Promise(resolve => setTimeout(resolve, 100));
                   }
          
          await audio.play();
          setPlayingIndex(index);
          setLoadingIndex(null);
          // Limpar erro se reprodução foi bem-sucedida
          setAudioErrors(prev => ({ ...prev, [index]: null }));
          console.log(`Áudio ${index} reproduzindo com sucesso`);
        }
      } catch (error) {
        console.error(`Erro ao reproduzir áudio ${index}:`, error);
        
        let errorMessage = 'Erro ao reproduzir áudio';
        
        if (error.name === 'AbortError') {
          errorMessage = 'Reprodução interrompida';
          // Não definir como erro permanente para AbortError
          return;
        } else if (error.name === 'NotSupportedError') {
          errorMessage = 'Formato de áudio não suportado ou arquivo não encontrado';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Reprodução não permitida (iOS pode bloquear reprodução automática)';
        } else if (error.name === 'NetworkError') {
          errorMessage = 'Erro de rede ao carregar áudio';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'Erro de segurança (CORS ou HTTPS)';
        } else if (error.message.includes('Failed to load')) {
          errorMessage = 'Arquivo de áudio não encontrado';
        }
        
        console.error(`Detalhes do erro:`, {
          name: error.name,
          message: error.message,
          code: error.code,
          readyState: audio.readyState,
          networkState: audio.networkState
        });
        
        setAudioErrors(prev => ({ ...prev, [index]: errorMessage }));
        setPlayingIndex(null);
        setLoadingIndex(null);
      }
    }
  };

  const handleAudioEnded = (index) => {
    setPlayingIndex(null);
    setLoadingIndex(null);
  };

  const handleAudioError = (index, error) => {
    console.log(`=== ERRO NO ELEMENTO DE ÁUDIO ${index} ===`);
    console.log('Error object:', error);
    console.log('Native event:', error.nativeEvent);
    console.log('Target:', error.target);
    console.log('iOS detectado:', isIOS());
    
    const audioElement = error.target;
    const audioError = error.nativeEvent?.error;
    
    console.log('Detalhes do erro:', {
      error: audioError,
      code: audioError?.code,
      message: audioError?.message,
      src: audioElement?.src,
      currentSrc: audioElement?.currentSrc,
      readyState: audioElement?.readyState,
      networkState: audioElement?.networkState,
      duration: audioElement?.duration
    });
    
    let errorMessage = 'Erro ao carregar arquivo de áudio';
    
    if (audioError) {
      switch (audioError.code) {
        case 1: // MEDIA_ERR_ABORTED
          errorMessage = 'Carregamento de áudio interrompido';
          break;
        case 2: // MEDIA_ERR_NETWORK
          errorMessage = 'Erro de rede ao carregar áudio';
          break;
        case 3: // MEDIA_ERR_DECODE
          errorMessage = 'Erro ao decodificar áudio (formato não suportado)';
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMessage = 'Formato de áudio não suportado pelo navegador';
          break;
        default:
          errorMessage = `Erro de áudio: ${audioError.message || 'Desconhecido'}`;
      }
    } else {
      // Se não há código de erro específico, verificar problemas específicos
      const url = audioElement?.src;
      if (url && url.includes('.m4a')) {
        errorMessage = 'Formato M4A pode não ser suportado neste navegador';
      } else if (url && url.includes('api/audio')) {
        errorMessage = 'Erro ao carregar áudio do servidor';
      } else {
        errorMessage = 'Erro ao carregar arquivo de áudio';
      }
    }
    
    // Detectar problemas específicos do iOS
    if (isIOS()) {
      console.log('iOS detectado - verificando problemas específicos');
      
      // Verificar se é problema de formato M4A
      if (audioElement?.src && audioElement.src.includes('.m4a')) {
        console.log('Arquivo M4A detectado - pode ser problema de compatibilidade');
        errorMessage = 'Formato M4A pode não ser suportado no iOS. Tente regravar em outro formato.';
      }
      
      // Verificar se é problema de CORS
      if (audioElement?.src && audioElement.src.includes('api/audio')) {
        console.log('Proxy de áudio detectado - verificando CORS');
        errorMessage = 'Erro ao carregar áudio do servidor (possível problema de CORS)';
      }
      
      // Verificar se é problema de HTTPS
      if (audioElement?.src && audioElement.src.startsWith('http://')) {
        console.log('HTTP detectado - iOS pode bloquear conteúdo misto');
        errorMessage = 'Erro de segurança: iOS pode bloquear conteúdo HTTP em HTTPS';
      }
    }
    
    console.log('Mensagem de erro final:', errorMessage);
    setAudioErrors(prev => ({ ...prev, [index]: errorMessage }));
    setPlayingIndex(null);
    setLoadingIndex(null);
  };

  // Tentar recarregar áudio
  const retryAudio = async (index, url) => {
    const audio = audioRefs.current[index];
    if (audio) {
      try {
        console.log(`Tentando recarregar áudio ${index}:`, url);
        
        // Limpar erro anterior
        setAudioErrors(prev => ({ ...prev, [index]: null }));
        
        // Aguardar um pouco antes de recarregar
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Forçar reload do áudio
        audio.load();
        
        // Aguardar carregamento
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
          
          audio.addEventListener('canplaythrough', () => {
            clearTimeout(timeout);
            resolve();
          }, { once: true });
          
          audio.addEventListener('error', () => {
            clearTimeout(timeout);
            reject(new Error('Erro ao carregar'));
          }, { once: true });
        });
        
        console.log(`Áudio ${index} recarregado com sucesso`);
        
      } catch (error) {
        console.error(`Erro ao recarregar áudio ${index}:`, error);
        setAudioErrors(prev => ({ ...prev, [index]: 'Falha ao recarregar áudio' }));
      }
    }
  };

  const handleDelete = (index) => {
    if (onDelete) {
      onDelete(index);
    }
  };

  // Testar URL do áudio
  const testAudioUrl = async (url) => {
    try {
      console.log('Testando URL do áudio:', url);
      const response = await fetch(url, { method: 'HEAD' });
      console.log('Resposta do teste:', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      return response.ok;
    } catch (error) {
      console.error('Erro no teste da URL:', error);
      return false;
    }
  };

  // Verificar se o formato é suportado (versão mais inteligente)
  const isFormatSupported = (url) => {
    const extension = url.split('.').pop().toLowerCase();
    const audio = document.createElement('audio');
    
    // Testar múltiplos MIME types para cada formato
    const supportedFormats = {
      'mp3': ['audio/mpeg', 'audio/mp3'],
      'm4a': ['audio/mp4', 'audio/m4a', 'audio/x-m4a'],
      'mp4': ['audio/mp4'],
      'wav': ['audio/wav'],
      'ogg': ['audio/ogg'],
      'webm': ['audio/webm'],
      'aac': ['audio/aac']
    };
    
    if (supportedFormats[extension]) {
      const types = supportedFormats[extension];
      return types.some(type => audio.canPlayType(type) !== '');
    }
    return false;
  };

  if (!audioUrls || audioUrls.length === 0) {
    return null;
  }

  return (
    <Card className="mb-3">
      <Card.Header>
        <h6 className="mb-0">
          <i className="bi bi-mic"></i> {t('Gravações de Áudio', '音频录制')}
          <Badge bg="secondary" className="ms-2">{audioUrls.length}</Badge>
        </h6>
      </Card.Header>
      <Card.Body>
        <ListGroup variant="flush">
          {audioUrls.map((url, index) => {
            const hasError = audioErrors[index];
            const isSupported = isFormatSupported(url);
            const extension = url.split('.').pop().toLowerCase();
            
            return (
              <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                  <Button
                    variant={playingIndex === index ? "danger" : hasError ? "warning" : loadingIndex === index ? "info" : "success"}
                    size="sm"
                    className="me-2"
                    onClick={() => handlePlay(index, url)}
                    disabled={disabled || hasError || loadingIndex === index}
                    title={hasError ? `Erro: ${hasError}` : loadingIndex === index ? 'Carregando...' : isSupported ? 'Reproduzir' : 'Formato não suportado'}
                  >
                    <i className={`bi ${
                      playingIndex === index ? 'bi-pause' : 
                      hasError ? 'bi-exclamation-triangle' : 
                      loadingIndex === index ? 'bi-hourglass-split' : 
                      'bi-play'
                    }`}></i>
                  </Button>
                  <div className="d-flex flex-column">
                    <span className="text-muted">
                      {t('Gravação', '录制')} #{index + 1}
                    </span>
                    {hasError && (
                      <small className="text-danger">
                        {hasError}
                      </small>
                    )}
                    {loadingIndex === index && !hasError && (
                      <small className="text-info">
                        <i className="bi bi-hourglass-split me-1"></i>
                        Carregando áudio...
                      </small>
                    )}
                    {!isSupported && !hasError && (
                      <small className="text-warning">
                        Formato {extension} pode não ser suportado neste navegador
                      </small>
                    )}
                    {!hasError && isIOS() && extension === 'm4a' && (
                      <small className="text-warning">
                        ⚠️ M4A pode ter problemas no iOS. Tente regravar em MP3.
                      </small>
                    )}
                  </div>
                </div>
                
                <div className="d-flex align-items-center">
                  <Button
                    variant="outline-info"
                    size="sm"
                    className="me-2"
                    onClick={() => testAudioUrl(url)}
                    disabled={disabled}
                    title="Testar URL do áudio"
                  >
                    <i className="bi bi-bug"></i>
                  </Button>
                  {hasError && (
                    <Button
                      variant="outline-warning"
                      size="sm"
                      className="me-2"
                      onClick={() => retryAudio(index, url)}
                      disabled={disabled}
                      title="Tentar recarregar áudio"
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                    </Button>
                  )}
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(index)}
                    disabled={disabled}
                  >
                    <i className="bi bi-trash"></i>
                  </Button>
                </div>

                {/* Audio element */}
                <audio
                  ref={el => audioRefs.current[index] = el}
                  onEnded={() => handleAudioEnded(index)}
                  onError={(e) => handleAudioError(index, e)}
                  onLoadStart={() => console.log(`Áudio ${index} iniciando carregamento`)}
                  onLoadedData={() => console.log(`Áudio ${index} dados carregados`)}
                  onCanPlay={() => console.log(`Áudio ${index} pode reproduzir`)}
                  preload={isIOS() ? "none" : "metadata"}
                  playsInline={isIOS()}
                  controls={false}
                  style={{ display: 'none' }}
                >
                  <source src={url} type="audio/mpeg" />
                  <source src={url} type="audio/mp3" />
                  <source src={url} type="audio/wav" />
                  <source src={url} type="audio/mp4" />
                  <source src={url} type="audio/ogg" />
                  <source src={url} type="audio/webm" />
                  Seu navegador não suporta o elemento de áudio.
                </audio>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default AudioPlayer;
