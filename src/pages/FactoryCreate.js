import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Spinner,
  Alert,
  Button,
  Form,
  Badge,
  Container
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import imageService from '../services/imageService';
import tagService from '../services/tagService';
import factoryServiceAPI from '../services/factoryServiceAPI';
import { useLanguage } from '../contexts/LanguageContext';

const FactoryCreate = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState({ image1: false, image2: false });
  const [imageUrls, setImageUrls] = useState({ image1: '', image2: '' });
  const [factoryTags, setFactoryTags] = useState({
    regiao: [],
    material: [],
    outros: [],
    tipoProduto: []
  });
  const [newTagInputs, setNewTagInputs] = useState({
    regiao: '',
    material: '',
    outros: '',
    tipoProduto: ''
  });
  const [availableTags, setAvailableTags] = useState({
    regiao: [],
    material: [],
    outros: [],
    tipoProduto: []
  });
  const [error, setError] = useState(null);

  // Função para carregar tags disponíveis diretamente do Firebase
  const loadAvailableTags = useCallback(async () => {
    try {
      console.log('FactoryCreate - Carregando tags globais do Firebase...');
      
      const tags = await tagService.getAllTagsFromFirebase();
      console.log('FactoryCreate - Tags globais carregadas do Firebase:', tags);
      
      setAvailableTags(tags || {
        regiao: [],
        material: [],
        outros: [],
        tipoProduto: []
      });
    } catch (error) {
      console.error('Erro ao carregar tags globais do Firebase:', error);
      setAvailableTags({
        regiao: [],
        material: [],
        outros: [],
        tipoProduto: []
      });
    }
  }, []);

  useEffect(() => {
    loadAvailableTags();
  }, [loadAvailableTags]);

  // Funções para gerenciar tags
  const addTagToFactory = (tag, division) => {
    setFactoryTags(prev => ({
      ...prev,
      [division]: [...prev[division], tag]
    }));
  };

  const removeTagFromFactory = (tagId, division) => {
    setFactoryTags(prev => ({
      ...prev,
      [division]: prev[division].filter(tag => tag.id !== tagId)
    }));
  };

  const addNewTagToFactory = async (division) => {
    const tagName = newTagInputs[division].trim();
    if (!tagName) return;

    console.log('=== ADD NEW TAG TO FACTORY ===');
    console.log('Tag:', tagName);
    console.log('Division:', division);
    console.log('Current factory tags:', factoryTags);

    const newTag = {
      id: Date.now().toString(),
      name: tagName,
      division: division,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      // Primeiro criar a tag globalmente
      await tagService.addTag(newTag);
      console.log('Tag adicionada globalmente:', newTag);
      
      // Depois adicionar à fábrica
      addTagToFactory(newTag, division);
      console.log('Tag adicionada à fábrica:', newTag);
      
      // Limpar input
      setNewTagInputs(prev => ({ ...prev, [division]: '' }));
    } catch (error) {
      console.error('Erro ao criar tag:', error);
      setError(t('Erro ao criar tag', '创建标签时出错'));
    }
  };

  const addAvailableTagToFactory = (tag) => {
    console.log('=== ADD AVAILABLE TAG TO FACTORY ===');
    console.log('Tag:', tag);
    console.log('Division:', tag.division);
    console.log('Current factory tags:', factoryTags);

    // Verificar se a tag já está na fábrica
    const isAlreadyAdded = factoryTags[tag.division]?.some(t => t.id === tag.id);
    if (isAlreadyAdded) {
      console.log('Tag já está na fábrica');
      return;
    }

    console.log('Adicionando tag global à fábrica:', tag.name);
    addTagToFactory(tag, tag.division);
  };

  const resetFactoryTags = () => {
    setFactoryTags({
      regiao: [],
      material: [],
      outros: [],
      tipoProduto: []
    });
    setNewTagInputs({
      regiao: '',
      material: '',
      outros: '',
      tipoProduto: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.target);
      const values = Object.fromEntries(formData.entries());

      console.log('=== CREATING FACTORY ===');
      console.log('Values:', values);
      console.log('Image URLs:', imageUrls);
      console.log('Factory Tags:', factoryTags);

      const factoryData = {
        name: values.name,
        contactName: values.contactName,
        phone: values.phone,
        wechat: values.wechat,
        email: values.email,
        location: values.location,
        segment: values.segment,
        description: values.description,
        imageUrl1: imageUrls.image1,
        imageUrl2: imageUrls.image2
      };

      console.log('Final factory data:', factoryData);

      const result = await factoryServiceAPI.createFactory(factoryData);
      console.log('Factory created successfully:', result);

      if (result && result.id) {
        // Salvar tags da fábrica
        const allFactoryTags = [
          ...factoryTags.regiao,
          ...factoryTags.material,
          ...factoryTags.outros,
          ...factoryTags.tipoProduto
        ];

        if (allFactoryTags.length > 0) {
          console.log('Saving factory tags:', allFactoryTags);
          
          for (const tag of allFactoryTags) {
            await tagService.createTagAssociation(tag, result.id);
          }
          
          console.log('Factory tags saved successfully');
        }

        // Limpar estados
        resetFactoryTags();
        setImageUrls({ image1: '', image2: '' });
        
        // Navegar de volta para o Dashboard
        navigate('/dashboard');
      } else {
        throw new Error('Fábrica criada mas sem ID válido');
      }
    } catch (err) {
      console.error('Erro ao criar fábrica:', err);
      setError(err.message || t('Erro ao criar fábrica', '创建工厂时出错'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Limpar estados
    resetFactoryTags();
    setImageUrls({ image1: '', image2: '' });
    setError(null);
    
    // Voltar para o Dashboard
    navigate('/dashboard');
  };

  return (
    <Container className="py-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h2 className="mb-0">{t('Nova Fábrica/Loja', '新建工厂/商店')}</h2>
          <Button variant="secondary" onClick={handleCancel}>
            {t('Cancelar', '取消')}
          </Button>
        </Card.Header>
        
        <Card.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {/* Nome da Fábrica/Loja */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Nome da Fábrica/Loja', '工厂/商店名称')}</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder={t('Digite o nome da fábrica/loja', '输入工厂/商店名称')}
                required
              />
            </Form.Group>

            {/* Nome do Contato */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Nome do Contato', '联系人姓名')}</Form.Label>
              <Form.Control
                type="text"
                name="contactName"
                placeholder={t('Digite o nome do contato', '输入联系人姓名')}
              />
            </Form.Group>

            {/* Telefone | WeChat */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('Telefone', '电话')}</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    placeholder={t('Digite o telefone', '输入电话')}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>{t('WeChat', '微信')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="wechat"
                    placeholder={t('Digite o WeChat', '输入微信')}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* E-mail */}
            <Form.Group className="mb-3">
              <Form.Label>{t('E-mail', '邮箱')}</Form.Label>
              <Form.Control
                type="email"
                name="email"
                placeholder={t('Digite o email', '输入邮箱')}
              />
            </Form.Group>

            {/* Localização */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Localização', '位置')}</Form.Label>
              <Form.Control
                type="text"
                name="location"
                placeholder={t('Digite a localização', '输入位置')}
              />
            </Form.Group>

            {/* Segmento */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Segmento', '细分')}</Form.Label>
              <Form.Control
                type="text"
                name="segment"
                placeholder={t('Digite o segmento', '输入细分')}
              />
            </Form.Group>

            {/* Descrição */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Descrição', '描述')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                placeholder={t('Digite uma descrição', '输入描述')}
              />
            </Form.Group>

            {/* Seção Tags da Fábrica */}
            <div className="border-top pt-4 mb-4">
              <h4 className="mb-3">{t('Tags da Fábrica', '工厂标签')}</h4>
              
              {/* Tags Região */}
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">{t('Região', '地区')}</Form.Label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {(factoryTags.regiao || []).map(tag => (
                    <Badge 
                      key={tag.id} 
                      bg="primary" 
                      className="d-flex align-items-center gap-1"
                      style={{ cursor: 'pointer', fontSize: '14px' }}
                      onClick={() => removeTagFromFactory(tag.id, 'regiao')}
                    >
                      {tag.name}
                      <i className="bi bi-x"></i>
                    </Badge>
                  ))}
                </div>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    placeholder={t('Nova tag', '新标签')}
                    value={newTagInputs.regiao}
                    onChange={(e) => setNewTagInputs(prev => ({ ...prev, regiao: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewTagToFactory('regiao'))}
                  />
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => addNewTagToFactory('regiao')}
                  >
                    {t('Adicionar', '添加')}
                  </Button>
                </div>
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {availableTags.regiao && availableTags.regiao.length > 0 && 
                    availableTags.regiao.map(tag => (
                      <Badge 
                        key={tag.id} 
                        bg="secondary" 
                        className="d-flex align-items-center gap-1"
                        style={{ cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => addAvailableTagToFactory(tag)}
                      >
                        {tag.name}
                        <i className="bi bi-plus"></i>
                      </Badge>
                    ))
                  }
                </div>
              </Form.Group>

              {/* Tags Tipo de Produto */}
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">{t('Tipo de Produto', '产品类型')}</Form.Label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {(factoryTags.tipoProduto || []).map(tag => (
                    <Badge 
                      key={tag.id} 
                      bg="info" 
                      className="d-flex align-items-center gap-1"
                      style={{ cursor: 'pointer', fontSize: '14px' }}
                      onClick={() => removeTagFromFactory(tag.id, 'tipoProduto')}
                    >
                      {tag.name}
                      <i className="bi bi-x"></i>
                    </Badge>
                  ))}
                </div>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    placeholder={t('Nova tag', '新标签')}
                    value={newTagInputs.tipoProduto}
                    onChange={(e) => setNewTagInputs(prev => ({ ...prev, tipoProduto: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewTagToFactory('tipoProduto'))}
                  />
                  <Button 
                    variant="outline-info" 
                    size="sm"
                    onClick={() => addNewTagToFactory('tipoProduto')}
                  >
                    {t('Adicionar', '添加')}
                  </Button>
                </div>
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {availableTags.tipoProduto && availableTags.tipoProduto.length > 0 && 
                    availableTags.tipoProduto.map(tag => (
                      <Badge 
                        key={tag.id} 
                        bg="secondary" 
                        className="d-flex align-items-center gap-1"
                        style={{ cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => addAvailableTagToFactory(tag)}
                      >
                        {tag.name}
                        <i className="bi bi-plus"></i>
                      </Badge>
                    ))
                  }
                </div>
              </Form.Group>

              {/* Tags Material */}
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">{t('Material', '材料')}</Form.Label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {(factoryTags.material || []).map(tag => (
                    <Badge 
                      key={tag.id} 
                      bg="success" 
                      className="d-flex align-items-center gap-1"
                      style={{ cursor: 'pointer', fontSize: '14px' }}
                      onClick={() => removeTagFromFactory(tag.id, 'material')}
                    >
                      {tag.name}
                      <i className="bi bi-x"></i>
                    </Badge>
                  ))}
                </div>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    placeholder={t('Nova tag', '新标签')}
                    value={newTagInputs.material}
                    onChange={(e) => setNewTagInputs(prev => ({ ...prev, material: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewTagToFactory('material'))}
                  />
                  <Button 
                    variant="outline-success" 
                    size="sm"
                    onClick={() => addNewTagToFactory('material')}
                  >
                    {t('Adicionar', '添加')}
                  </Button>
                </div>
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {availableTags.material && availableTags.material.length > 0 && 
                    availableTags.material.map(tag => (
                      <Badge 
                        key={tag.id} 
                        bg="secondary" 
                        className="d-flex align-items-center gap-1"
                        style={{ cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => addAvailableTagToFactory(tag)}
                      >
                        {tag.name}
                        <i className="bi bi-plus"></i>
                      </Badge>
                    ))
                  }
                </div>
              </Form.Group>

              {/* Tags Outros */}
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">{t('Outros', '其他')}</Form.Label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  {(factoryTags.outros || []).map(tag => (
                    <Badge 
                      key={tag.id} 
                      bg="warning" 
                      className="d-flex align-items-center gap-1"
                      style={{ cursor: 'pointer', fontSize: '14px' }}
                      onClick={() => removeTagFromFactory(tag.id, 'outros')}
                    >
                      {tag.name}
                      <i className="bi bi-x"></i>
                    </Badge>
                  ))}
                </div>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    placeholder={t('Nova tag', '新标签')}
                    value={newTagInputs.outros}
                    onChange={(e) => setNewTagInputs(prev => ({ ...prev, outros: e.target.value }))}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewTagToFactory('outros'))}
                  />
                  <Button 
                    variant="outline-warning" 
                    size="sm"
                    onClick={() => addNewTagToFactory('outros')}
                  >
                    {t('Adicionar', '添加')}
                  </Button>
                </div>
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {availableTags.outros && availableTags.outros.length > 0 && 
                    availableTags.outros.map(tag => (
                      <Badge 
                        key={tag.id} 
                        bg="secondary" 
                        className="d-flex align-items-center gap-1"
                        style={{ cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => addAvailableTagToFactory(tag)}
                      >
                        {tag.name}
                        <i className="bi bi-plus"></i>
                      </Badge>
                    ))
                  }
                </div>
              </Form.Group>
            </div>

            {/* Imagem Principal */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Imagem Principal', '主图片')}</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                name="image1"
                onChange={async (e) => {
                  e.preventDefault();
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      console.log('📤 Iniciando upload da imagem principal...', {
                        fileName: file.name,
                        fileSize: file.size
                      });
                      setUploadingImages(prev => ({ ...prev, image1: true }));
                      const imageUrl = await imageService.uploadFile(file);
                      console.log('✅ Imagem principal enviada com sucesso:', imageUrl);
                      setImageUrls(prev => ({ ...prev, image1: imageUrl }));
                    } catch (error) {
                      console.error('❌ Erro no upload da imagem:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    } finally {
                      console.log('🏁 Finalizando upload da imagem principal...');
                      setUploadingImages(prev => ({ ...prev, image1: false }));
                    }
                  }
                }}
              />
              <Form.Control
                type="hidden"
                name="imageUrl1"
                value={imageUrls.image1}
              />
              {/* Exibir imagem após upload */}
              {imageUrls.image1 && (
                <div className="mt-2">
                  <img 
                    src={imageUrls.image1} 
                    alt="Imagem Principal" 
                    className="img-fluid rounded"
                    style={{ maxHeight: '200px', maxWidth: '100%' }}
                  />
                </div>
              )}
            </Form.Group>

            {/* Imagem Secundária */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Imagem Secundária', '副图片')}</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                name="image2"
                onChange={async (e) => {
                  e.preventDefault();
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      console.log('📤 Iniciando upload da imagem secundária...', {
                        fileName: file.name,
                        fileSize: file.size
                      });
                      setUploadingImages(prev => ({ ...prev, image2: true }));
                      const imageUrl = await imageService.uploadFile(file);
                      console.log('✅ Imagem secundária enviada com sucesso:', imageUrl);
                      setImageUrls(prev => ({ ...prev, image2: imageUrl }));
                    } catch (error) {
                      console.error('❌ Erro no upload da imagem secundária:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    } finally {
                      console.log('🏁 Finalizando upload da imagem secundária...');
                      setUploadingImages(prev => ({ ...prev, image2: false }));
                    }
                  }
                }}
              />
              <Form.Control
                type="hidden"
                name="imageUrl2"
                value={imageUrls.image2}
              />
              {/* Exibir imagem após upload */}
              {imageUrls.image2 && (
                <div className="mt-2">
                  <img 
                    src={imageUrls.image2} 
                    alt="Imagem Secundária" 
                    className="img-fluid rounded"
                    style={{ maxHeight: '200px', maxWidth: '100%' }}
                  />
                </div>
              )}
            </Form.Group>

            {/* Botão Salvar (100%) */}
            <Button 
              variant="primary" 
              type="submit" 
              className="w-100"
              disabled={submitting || uploadingImages.image1 || uploadingImages.image2}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Salvando...', '保存中...')}
                </>
              ) : uploadingImages.image1 || uploadingImages.image2 ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Enviando imagens...', '上传图片中...')}
                </>
              ) : (
                t('Salvar', '保存')
              )}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default FactoryCreate;