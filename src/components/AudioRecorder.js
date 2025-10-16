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
      setError(t('Permissão de microfone negada', '麦克风权限被拒绝'));
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
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
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
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
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

        {/* Player de áudio */}
        {audioUrl && (
          <div className="text-center">
            <audio 
              ref={audioRef}
              controls 
              className="w-100 mb-3"
              style={{ maxWidth: '400px' }}
            >
              <source src={audioUrl} type="audio/webm" />
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
