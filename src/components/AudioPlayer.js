import React, { useState, useRef } from 'react';
import { Button, Card, ListGroup, Badge } from 'react-bootstrap';
import { useLanguage } from '../contexts/LanguageContext';

const AudioPlayer = ({ audioUrls = [], onDelete, disabled = false }) => {
  const { t } = useLanguage();
  const [playingIndex, setPlayingIndex] = useState(null);
  const audioRefs = useRef({});

  const handlePlay = (index, url) => {
    // Pausar todos os outros áudios
    Object.values(audioRefs.current).forEach(audio => {
      if (audio && !audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    });

    const audio = audioRefs.current[index];
    if (audio) {
      if (playingIndex === index && !audio.paused) {
        audio.pause();
        setPlayingIndex(null);
      } else {
        audio.play();
        setPlayingIndex(index);
      }
    }
  };

  const handleAudioEnded = (index) => {
    setPlayingIndex(null);
  };

  const handleDelete = (index) => {
    if (onDelete) {
      onDelete(index);
    }
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
          {audioUrls.map((url, index) => (
            <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <Button
                  variant={playingIndex === index ? "danger" : "success"}
                  size="sm"
                  className="me-2"
                  onClick={() => handlePlay(index, url)}
                  disabled={disabled}
                >
                  <i className={`bi ${playingIndex === index ? 'bi-pause' : 'bi-play'}`}></i>
                </Button>
                <span className="text-muted">
                  {t('Gravação', '录制')} #{index + 1}
                </span>
              </div>
              
              <div className="d-flex align-items-center">
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
                preload="metadata"
                style={{ display: 'none' }}
              />
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default AudioPlayer;
