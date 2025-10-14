import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAutoTranslation } from '../hooks/useAutoTranslation';
import { useLanguage } from '../contexts/LanguageContext';

// Componente de exemplo para demonstrar tradução automática
const AutoTranslationExample = () => {
  const { t, isTranslating } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    remark: '',
    obs: '',
    englishDescription: ''
  });

  const {
    fields,
    translatedFields,
    updateFields,
    translateCurrentFields,
    isTranslating: isTranslatingFields
  } = useAutoTranslation(formData);

  // Atualizar campos quando formData muda
  useEffect(() => {
    updateFields(formData);
  }, [formData, updateFields]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleManualTranslate = async () => {
    await translateCurrentFields();
  };

  return (
    <div className="p-4">
      <h3>{t('Tradução Automática', '自动翻译')}</h3>
      
      {isTranslating || isTranslatingFields ? (
        <Alert variant="info" className="d-flex align-items-center">
          <Spinner animation="border" size="sm" className="me-2" />
          {t('Traduzindo...', '翻译中...')}
        </Alert>
      ) : null}

      <div className="row">
        <div className="col-md-6">
          <h5>{t('Campos Originais', '原始字段')}</h5>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>{t('Nome', '名称')}</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder={t('Digite o nome', '输入名称')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Descrição', '描述')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={t('Digite a descrição', '输入描述')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Observações', '备注')}</Form.Label>
              <Form.Control
                type="text"
                value={formData.remark}
                onChange={(e) => handleInputChange('remark', e.target.value)}
                placeholder={t('Digite observações', '输入备注')}
              />
            </Form.Group>

            <Button 
              variant="primary" 
              onClick={handleManualTranslate}
              disabled={isTranslating || isTranslatingFields}
            >
              {t('Traduzir Manualmente', '手动翻译')}
            </Button>
          </Form>
        </div>

        <div className="col-md-6">
          <h5>{t('Campos Traduzidos', '翻译字段')}</h5>
          <div className="border p-3 bg-light">
            <div className="mb-2">
              <strong>{t('Nome', '名称')}:</strong> {translatedFields.name || '-'}
            </div>
            <div className="mb-2">
              <strong>{t('Descrição', '描述')}:</strong> {translatedFields.description || '-'}
            </div>
            <div className="mb-2">
              <strong>{t('Observações', '备注')}:</strong> {translatedFields.remark || '-'}
            </div>
            <div className="mb-2">
              <strong>{t('OBS', '观察')}:</strong> {translatedFields.obs || '-'}
            </div>
            <div className="mb-2">
              <strong>{t('English Description', '英文描述')}:</strong> {translatedFields.englishDescription || '-'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <Alert variant="info">
          <h6>{t('Como Funciona', '工作原理')}</h6>
          <ul>
            <li>{t('Digite texto em qualquer idioma nos campos', '在任何字段中输入任何语言的文本')}</li>
            <li>{t('Quando alternar o idioma, os campos serão traduzidos automaticamente', '切换语言时，字段将自动翻译')}</li>
            <li>{t('Use o botão "Traduzir Manualmente" para forçar a tradução', '使用"手动翻译"按钮强制翻译')}</li>
            <li>{t('A tradução funciona de português para chinês e vice-versa', '翻译在葡萄牙语和中文之间工作')}</li>
          </ul>
        </Alert>
      </div>
    </div>
  );
};

export default AutoTranslationExample;
