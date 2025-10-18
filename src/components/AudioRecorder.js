import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Alert } from 'react-bootstrap';
import { useLanguage } from '../contexts/LanguageContext';
import audioUploadService from '../services/audioUploadService';
import productServiceAPI from '../services/productServiceAPI';

const AudioRecorder = ({ onAudioReady, onAudioChange, initialAudioUrl, disabled = false, productId = null, collapsed = false }) => {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl || '');
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedAudios, setUploadedAudios] = useState([]);
  const [savingToFirebase, setSavingToFirebase] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

  // Notificar mudanças no áudio para o componente pai
  useEffect(() => {
    if (onAudioChange && audioUrl) {
      console.log('AudioRecorder: Notificando mudança de áudio para componente pai:', audioUrl);
      onAudioChange(audioUrl);
    }
  }, [audioUrl, onAudioChange]);

  // Verificar suporte do navegador
  const isSupported = () => {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder;
  };

  // Solicitar permissão de microfone
  const requestPermission = async () => {
    if (!isSupported()) {
      setError(t('Seu navegador não suporta gravação de áudio', '您的浏览器不支持音频录制'));
      return false;
    }

    try {
      // Verificar se estamos em HTTPS (necessário para iOS)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        setError(t('Gravação de áudio requer HTTPS em dispositivos móveis', '移动设备上的音频录制需要HTTPS'));
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      streamRef.current = stream;
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      console.error('Erro ao solicitar permissão:', err);
      
      let errorMessage = t('Permissão de microfone negada', '麦克风权限被拒绝');
      
      if (err.name === 'NotAllowedError') {
        errorMessage = t('Permissão de microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador.', '麦克风权限被拒绝。请在浏览器设置中允许麦克风访问。');
      } else if (err.name === 'NotFoundError') {
        errorMessage = t('Nenhum microfone encontrado. Verifique se há um microfone conectado.', '未找到麦克风。请检查是否连接了麦克风。');
      } else if (err.name === 'NotSupportedError') {
        errorMessage = t('Gravação de áudio não suportada neste dispositivo.', '此设备不支持音频录制。');
      } else if (err.name === 'SecurityError') {
        errorMessage = t('Erro de segurança. Certifique-se de que o site está usando HTTPS.', '安全错误。请确保网站使用HTTPS。');
      }
      
      setError(errorMessage);
      setHasPermission(false);
      return false;
    }
  };

  // Iniciar gravação
  const startRecording = async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      const stream = streamRef.current;
      
      // Priorizar MP3 sempre - formato mais universalmente compatível
      const mimeTypes = [
        'audio/mpeg',           // MP3 - melhor compatibilidade universal
        'audio/mp3',            // MP3 alternativo
        'audio/wav',            // WAV - universal fallback
        'audio/mp4',            // M4A - iOS fallback
        'audio/m4a',            // M4A alternativo
        'audio/ogg;codecs=opus', // OGG com codec específico
        'audio/ogg',            // OGG genérico
        'audio/webm;codecs=opus', // WebM com codec específico
        'audio/webm'            // WebM genérico
      ];
      
      let selectedMimeType = null;
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      if (!selectedMimeType) {
        throw new Error('Nenhum formato de áudio suportado');
      }
      
      console.log('Usando formato de áudio:', selectedMimeType);
      console.log('Priorizando MP3 para máxima compatibilidade');
      console.log('Ordem de formatos:', mimeTypes);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType
      });

      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setError(null);

      const chunks = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMimeType });
        const url = URL.createObjectURL(blob);
        
        // Chamar callback com o áudio
        if (onAudioReady) {
          onAudioReady(blob, url);
        }
        
        // Upload automático se productId estiver disponível
        if (productId) {
          uploadAudio(blob);
        }
      };

      mediaRecorder.start(100); // Coletar dados a cada 100ms
      
      // Iniciar timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 0.1);
      }, 100);

    } catch (err) {
      console.error('Erro ao iniciar gravação:', err);
      setError(t('Erro ao iniciar gravação', '开始录制时出错'));
    }
  };

  // Pausar/Retomar gravação
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 0.1);
      }, 100);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      clearInterval(timerRef.current);
    }
  };

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      clearInterval(timerRef.current);
    }
  };

  // Upload automático do áudio
  const uploadAudio = async (blob) => {
    if (!blob || !productId) return;
    
    try {
      setIsUploading(true);
      setError(null);
      
      console.log('Iniciando upload automático do áudio...');
      const result = await audioUploadService.uploadAudio(blob, productId);
      
      if (result.success) {
        const newAudio = {
          id: Date.now().toString(),
          url: result.audioUrl,
          fileName: result.fileName,
          uploadedAt: new Date().toISOString()
        };
        
        setUploadedAudios(prev => [...prev, newAudio]);
        console.log('Upload realizado com sucesso:', result.audioUrl);
        
        // Atualizar audioUrl principal para notificar o componente pai
        setAudioUrl(result.audioUrl);
        
        // Salvar array de áudios no Firebase
        await saveAudiosToFirebase([...uploadedAudios, newAudio]);
      }
    } catch (error) {
      console.error('Erro no upload automático:', error);
      setError(`Erro no upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Salvar array de áudios no Firebase
  const saveAudiosToFirebase = async (audios) => {
    if (!productId || productId === 'new') {
      console.log('ProductId inválido para salvar no Firebase:', productId);
      console.log('Áudio será salvo junto com o produto quando ele for criado');
      return;
    }

    try {
      setSavingToFirebase(true);
      console.log('Salvando áudios no Firebase para produto:', productId, 'Áudios:', audios);
      
      // Atualizar produto no Firebase com o array de áudios
      const updateData = {
        audioUrls: audios,
        audioUpdatedAt: new Date().toISOString()
      };
      
      // Se não há áudios, limpar também o campo audioUrl legado
      if (audios.length === 0) {
        updateData.audioUrl = '';
        updateData.audioUploadedAt = '';
      }
      
      await productServiceAPI.updateProduct(productId, updateData);
      
      console.log('Áudios salvos no Firebase com sucesso');
    } catch (error) {
      console.error('Erro ao salvar áudios no Firebase:', error);
      setError(`Erro ao salvar áudios: ${error.message}`);
    } finally {
      setSavingToFirebase(false);
    }
  };


  // Limpar áudio
  const clearAudio = async () => {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl('');
    setRecordingTime(0);
    setError(null);
    setIsUploading(false);
    setSavingToFirebase(false);
    
    // Limpar áudio do Firebase se existir
    if (productId && productId !== 'new') {
      try {
        await productServiceAPI.updateProduct(productId, {
          audioUrls: [],
          audioUrl: '',
          audioUploadedAt: '',
          audioUpdatedAt: new Date().toISOString()
        });
        console.log('Áudios removidos do Firebase');
        setUploadedAudios([]);
      } catch (error) {
        console.error('Erro ao remover áudios do Firebase:', error);
      }
    }
    
    if (onAudioReady) {
      onAudioReady(null, '');
    }
  };

  // Formatar tempo
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  // Carregar áudios existentes quando o componente monta
  useEffect(() => {
    const loadExistingAudios = async () => {
      if (productId && productId !== 'new') {
        try {
          console.log('Carregando áudios existentes para produto:', productId);
          
          // Buscar dados do produto no Firebase
          const productData = await productServiceAPI.getProductById(productId);
          
          if (productData && productData.audioUrls && Array.isArray(productData.audioUrls)) {
            console.log('Áudios encontrados no produto:', productData.audioUrls);
            setUploadedAudios(productData.audioUrls);
          } else if (productData && productData.audioUrl) {
            // Fallback para áudio único (compatibilidade com versão anterior)
            console.log('Áudio único encontrado (fallback):', productData.audioUrl);
            const singleAudio = {
              id: 'legacy',
              url: productData.audioUrl,
              fileName: 'Áudio existente',
              uploadedAt: productData.audioUploadedAt || new Date().toISOString()
            };
            setUploadedAudios([singleAudio]);
          } else {
            console.log('Nenhum áudio encontrado para o produto');
            setUploadedAudios([]);
          }
        } catch (error) {
          console.error('Erro ao carregar áudios existentes:', error);
          setUploadedAudios([]);
        }
      } else if (initialAudioUrl) {
        // Se há um áudio inicial mas não há productId válido
        const existingAudio = {
          id: 'initial',
          url: initialAudioUrl,
          fileName: 'Áudio existente',
          uploadedAt: new Date().toISOString()
        };
        setUploadedAudios([existingAudio]);
      }
    };

    loadExistingAudios();
  }, [productId, initialAudioUrl]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl && audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  if (!isSupported()) {
    return (
      <Alert variant="warning">
        {t('Seu navegador não suporta gravação de áudio', '您的浏览器不支持音频录制')}
      </Alert>
    );
  }

  return (
    <Card className="mb-3">
      <Card.Body className="p-2">
        {/* Título com quantidade de áudios */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div 
            className="d-flex align-items-center cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ cursor: 'pointer' }}
          >
            <h6 className="mb-0 me-2">
              {t('Áudios', '音频')} | {uploadedAudios.length}
            </h6>
            <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
          </div>
          {uploadedAudios.length > 0 && (
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={clearAudio}
              disabled={disabled}
            >
              <i className="bi bi-trash"></i>
            </Button>
          )}
        </div>

        {/* Conteúdo do card - apenas quando expandido */}
        {isExpanded && (
          <>
            {/* Apenas erros críticos */}
            {error && (
              <Alert variant="danger" className="mb-2 py-2">
                <small>{error}</small>
              </Alert>
            )}

            {/* Botão Iniciar Gravação - sempre visível quando não está gravando */}
            {!isRecording && (
              <div className="text-center mb-3">
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={startRecording}
                  disabled={disabled || hasPermission === false}
                  className="w-100"
                >
                  <i className="bi bi-mic me-2"></i>
                  {t('Iniciar Gravação', '开始录制')}
                </Button>
              </div>
            )}

            {/* Controles durante a gravação */}
            {isRecording && (
              <div className="text-center mb-3">
                <div className="mb-2">
                  <span className="badge bg-primary fs-6">
                    {formatTime(recordingTime)}
                  </span>
                </div>
                
                <div className="d-flex justify-content-center gap-2">
                  <Button 
                    variant={isPaused ? "success" : "warning"}
                    onClick={togglePause}
                    disabled={disabled}
                  >
                    <i className={`bi ${isPaused ? 'bi-play' : 'bi-pause'}`}></i>
                    {isPaused ? t('Retomar', '恢复') : t('Pausar', '暂停')}
                  </Button>
                  
                  <Button 
                    variant="danger"
                    onClick={stopRecording}
                    disabled={disabled}
                  >
                    <i className="bi bi-stop"></i> {t('Parar', '停止')}
                  </Button>
                </div>
              </div>
            )}

            {/* Status de upload */}
            {isUploading && (
              <div className="text-center mb-2">
                <Alert variant="info" className="py-2">
                  <small>
                    <i className="bi bi-cloud-upload me-1"></i>
                    {t('Enviando áudio...', '正在上传音频...')}
                  </small>
                </Alert>
              </div>
            )}

            {/* Status de salvamento no Firebase */}
            {savingToFirebase && (
              <div className="text-center mb-2">
                <Alert variant="success" className="py-2">
                  <small>
                    <i className="bi bi-database me-1"></i>
                    {t('Salvando no banco de dados...', '正在保存到数据库...')}
                  </small>
                </Alert>
              </div>
            )}

            {/* Lista de áudios salvos */}
            {uploadedAudios.length > 0 && (
              <div className="mb-3">
                {uploadedAudios.map((audio, index) => (
                  <div key={audio.id} className="border rounded p-2 mb-2">
                    <div className="d-flex justify-content-center align-items-center mb-2">
                      <small className="text-muted">
                        {new Date(audio.uploadedAt).toLocaleString()}
                      </small>
                    </div>
                    <audio
                      controls
                      className="w-100"
                      style={{ maxWidth: '400px' }}
                      playsInline={true}
                      preload="metadata"
                    >
                      <source src={audio.url} type="audio/mpeg" />
                      <source src={audio.url} type="audio/mp4" />
                      <source src={audio.url} type="audio/webm" />
                      <source src={audio.url} type="audio/ogg" />
                      <source src={audio.url} type="audio/wav" />
                      {t('Seu navegador não suporta o elemento de áudio', '您的浏览器不支持音频元素')}
                    </audio>
                  </div>
                ))}
              </div>
            )}

          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default AudioRecorder;
