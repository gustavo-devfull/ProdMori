import React, { useState, useRef, useEffect } from 'react';
import { Button, Card, Alert } from 'react-bootstrap';
import { useLanguage } from '../contexts/LanguageContext';

const AudioRecorder = ({ onAudioReady, initialAudioUrl, disabled = false }) => {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl || '');
  const [error, setError] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [hasRecorded, setHasRecorded] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const streamRef = useRef(null);

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
      
      // Tentar formatos em ordem de compatibilidade (MP3 primeiro)
      const mimeTypes = [
        'audio/mpeg',           // MP3 - melhor compatibilidade
        'audio/wav',            // WAV - universal
        'audio/webm;codecs=opus', // WebM com codec específico
        'audio/webm',           // WebM genérico
        'audio/ogg;codecs=opus', // OGG com codec específico
        'audio/ogg',            // OGG genérico
        'audio/mp4',            // M4A - último recurso
        'audio/m4a'             // M4A alternativo
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
        
        // Marcar que há um áudio gravado
        setHasRecorded(true);
        
        // Chamar callback com o áudio
        if (onAudioReady) {
          onAudioReady(blob, url);
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

  // Regravar
  const reRecord = () => {
    setAudioUrl('');
    setRecordingTime(0);
    setError(null);
    setHasRecorded(false);
    
    // Limpar áudio anterior
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Limpar áudio
  const clearAudio = () => {
    if (audioUrl && audioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl('');
    setRecordingTime(0);
    setError(null);
    setHasRecorded(false);
    
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
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0">{t('Gravação de Áudio', '音频录制')}</h6>
          {audioUrl && (
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={clearAudio}
              disabled={disabled}
            >
              <i className="bi bi-trash"></i> {t('Limpar', '清除')}
            </Button>
          )}
        </div>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
            {/* Instruções específicas para iOS */}
            {error.includes('Permissão de microfone negada') && (
              <div className="mt-2">
                <small>
                  <strong>Instruções para iPhone/iPad:</strong><br/>
                  1. Toque no ícone "aA" na barra de endereços<br/>
                  2. Selecione "Configurações do Site"<br/>
                  3. Ative "Microfone"<br/>
                  4. Recarregue a página
                </small>
              </div>
            )}
          </Alert>
        )}

        {/* Aviso para iOS */}
        {!hasPermission && !error && (
          <Alert variant="info" className="mb-3">
            <small>
              <strong>📱 iPhone/iPad:</strong> Certifique-se de permitir o acesso ao microfone quando solicitado.
            </small>
          </Alert>
        )}

        {/* Controles de gravação */}
        {!audioUrl && (
          <div className="text-center">
            {!isRecording ? (
              <Button 
                variant="success" 
                size="lg"
                onClick={startRecording}
                disabled={disabled || hasPermission === false}
                className="mb-3"
              >
                <i className="bi bi-mic me-2"></i>
                {t('Iniciar Gravação', '开始录制')}
              </Button>
            ) : (
              <div className="mb-3">
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
          </div>
        )}

        {/* Status de envio */}
        {hasRecorded && !audioUrl && (
          <div className="text-center mb-3">
            <Alert variant="info">
              <i className="bi bi-cloud-upload me-2"></i>
              {t('Áudio gravado! Aguardando envio...', '音频已录制！等待上传...')}
            </Alert>
          </div>
        )}

        {/* Player de áudio */}
        {audioUrl && !audioUrl.startsWith('blob:') && (
          <div className="text-center">
            <audio
              ref={audioRef}
              controls
              className="w-100 mb-3"
              style={{ maxWidth: '400px' }}
            >
              <source src={audioUrl} type="audio/mp4" />
              <source src={audioUrl} type="audio/webm" />
              <source src={audioUrl} type="audio/ogg" />
              {t('Seu navegador não suporta o elemento de áudio', '您的浏览器不支持音频元素')}
            </audio>
            
            <div className="d-flex justify-content-center gap-2">
              <Button 
                variant="outline-primary"
                onClick={reRecord}
                disabled={disabled}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                {t('Regravar', '重新录制')}
              </Button>
            </div>
          </div>
        )}

        {/* Informações */}
        <div className="mt-3 text-muted small">
          <div className="d-flex justify-content-between">
            <span>{t('Formato:', '格式:')} WebM (Opus)</span>
            <span>{t('Qualidade:', '质量:')} 44.1kHz</span>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AudioRecorder;
