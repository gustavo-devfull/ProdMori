import React, { useState, useRef } from 'react';
import { Button, Card, ListGroup, Badge } from 'react-bootstrap';
import { useLanguage } from '../contexts/LanguageContext';

const AudioPlayer = ({ audioUrls = [], onDelete, disabled = false }) => {
  const { t } = useLanguage();
  const [playingIndex, setPlayingIndex] = useState(null);
  const [audioErrors, setAudioErrors] = useState({});
  const audioRefs = useRef({});

  const handlePlay = async (index, url) => {
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
        } else {
          // Verificar se o áudio pode ser reproduzido
          console.log(`Tentando reproduzir áudio ${index}:`, url);
          
          // Aguardar um pouco antes de tentar reproduzir para evitar AbortError
          await new Promise(resolve => setTimeout(resolve, 100));
          
          await audio.play();
          setPlayingIndex(index);
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
          errorMessage = 'Reprodução não permitida pelo navegador';
        } else if (error.message.includes('Failed to load')) {
          errorMessage = 'Arquivo de áudio não encontrado';
        }
        
        setAudioErrors(prev => ({ ...prev, [index]: errorMessage }));
        setPlayingIndex(null);
      }
    }
  };

  const handleAudioEnded = (index) => {
    setPlayingIndex(null);
  };

  const handleAudioError = (index, error) => {
    console.error(`Erro no elemento de áudio ${index}:`, error);
    console.error('Detalhes do erro:', {
      error: error.nativeEvent?.error,
      code: error.nativeEvent?.error?.code,
      message: error.nativeEvent?.error?.message
    });
    
    let errorMessage = 'Erro ao carregar áudio';
    
    if (error.nativeEvent?.error) {
      const audioError = error.nativeEvent.error;
      switch (audioError.code) {
        case 1: // MEDIA_ERR_ABORTED
          errorMessage = 'Carregamento de áudio interrompido';
          break;
        case 2: // MEDIA_ERR_NETWORK
          errorMessage = 'Erro de rede ao carregar áudio';
          break;
        case 3: // MEDIA_ERR_DECODE
          errorMessage = 'Erro ao decodificar áudio';
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMessage = 'Formato de áudio não suportado';
          break;
        default:
          errorMessage = `Erro de áudio: ${audioError.message || 'Desconhecido'}`;
      }
    }
    
    setAudioErrors(prev => ({ ...prev, [index]: errorMessage }));
    setPlayingIndex(null);
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

  // Verificar se o formato é suportado
  const isFormatSupported = (url) => {
    const extension = url.split('.').pop().toLowerCase();
    const audio = document.createElement('audio');
    const supportedFormats = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'webm': 'audio/webm',
      'm4a': 'audio/mp4'
    };
    
    if (supportedFormats[extension]) {
      return audio.canPlayType(supportedFormats[extension]) !== '';
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
                    variant={playingIndex === index ? "danger" : hasError ? "warning" : "success"}
                    size="sm"
                    className="me-2"
                    onClick={() => handlePlay(index, url)}
                    disabled={disabled || hasError}
                    title={hasError ? `Erro: ${hasError}` : isSupported ? 'Reproduzir' : 'Formato não suportado'}
                  >
                    <i className={`bi ${playingIndex === index ? 'bi-pause' : hasError ? 'bi-exclamation-triangle' : 'bi-play'}`}></i>
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
                    {!isSupported && !hasError && (
                      <small className="text-warning">
                        Formato {extension} pode não ser suportado
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
                  src={url}
                  onEnded={() => handleAudioEnded(index)}
                  onError={(e) => handleAudioError(index, e)}
                  preload="metadata"
                  style={{ display: 'none' }}
                />
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default AudioPlayer;
