import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Spinner,
  Alert,
  Button,
  Form,
  Modal,
  Badge
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import factoryServiceAPI from '../services/factoryServiceAPI';
import imageService from '../services/imageService';
import tagService from '../services/tagService';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [allFactories, setAllFactories] = useState([]);
  const [selectedFactory, setSelectedFactory] = useState('');
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage] = useState('');
  const [uploadingImages, setUploadingImages] = useState({ image1: false, image2: false });
  const [imageUrls, setImageUrls] = useState({ image1: '', image2: '' });
  const [factoryTags, setFactoryTags] = useState({
    regiao: [],
    material: [],
    outros: []
  });
  const [newTagInputs, setNewTagInputs] = useState({
    regiao: '',
    material: '',
    outros: ''
  });
  const [availableTags, setAvailableTags] = useState({
    regiao: [],
    material: [],
    outros: []
  });
  const [showAvailableTags, setShowAvailableTags] = useState(false);

  const loadFactories = useCallback(async () => {
    try {
      setLoading(true);
      const factories = await factoryServiceAPI.getAllFactories();
      
      // Verificar se os dados são arrays válidos
      const validFactories = Array.isArray(factories) ? factories : [];
      setAllFactories(validFactories);
    } catch (err) {
      setError(t('Erro ao carregar fábricas', '加载工厂时出错'));
      console.error(err);
      setAllFactories([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Função para carregar tags disponíveis
  const loadAvailableTags = useCallback(async () => {
    try {
      console.log('Dashboard - Carregando tags globais...');
      const globalTags = await tagService.getAllTags();
      console.log('Dashboard - Tags globais carregadas:', globalTags);
      
      // Garantir que a estrutura está correta
      const safeTags = {
        regiao: Array.isArray(globalTags?.regiao) ? globalTags.regiao : [],
        material: Array.isArray(globalTags?.material) ? globalTags.material : [],
        outros: Array.isArray(globalTags?.outros) ? globalTags.outros : []
      };
      
      setAvailableTags(safeTags);
    } catch (error) {
      console.error('Erro ao carregar tags disponíveis:', error);
      // Fallback para localStorage
      try {
        const localGlobalTags = JSON.parse(localStorage.getItem('globalTags') || '{"regiao":[],"material":[],"outros":[]}');
        setAvailableTags(localGlobalTags);
      } catch (fallbackError) {
        console.error('Erro no fallback localStorage:', fallbackError);
        setAvailableTags({
          regiao: [],
          material: [],
          outros: []
        });
      }
    }
  }, []);

  useEffect(() => {
    loadFactories();
  }, [loadFactories]);

  useEffect(() => {
    loadAvailableTags();
  }, [loadAvailableTags]);

  const handleFactorySelect = (factoryId) => {
    if (factoryId) {
      // Navegar para a página da fábrica específica
      navigate(`/factory/${factoryId}`);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      // Verificar se há uploads em andamento
      if (uploadingImages.image1 || uploadingImages.image2) {
        console.log('Aguardando upload das imagens...');
        setError(t('Aguarde o upload das imagens terminar', '等待图片上传完成'));
        return;
      }
      
      // Usar as URLs das imagens do estado do React
      const finalValues = {
        ...values,
        imageUrl1: imageUrls.image1 || values.imageUrl1,
        imageUrl2: imageUrls.image2 || values.imageUrl2
      };
      
      const newFactory = await factoryServiceAPI.createFactory(finalValues);
      
      // Salvar as tags da fábrica usando o serviço
      if (newFactory && newFactory.id) {
        console.log('=== SAVING FACTORY TAGS ===');
        console.log('Factory ID:', newFactory.id);
        console.log('Factory tags to save:', factoryTags);
        
        Object.keys(factoryTags).forEach(division => {
          console.log(`Processing division: ${division}`);
          factoryTags[division].forEach(tag => {
            console.log(`Saving tag: ${tag.name} (${tag.id}) to factory ${newFactory.id}`);
            tagService.addTagToFactory(newFactory.id, tag);
          });
        });
        
        console.log('All factory tags saved');
      }
      
      setModalVisible(false);
      await loadFactories();
      setError(null);
    } catch (err) {
      setError(t('Erro ao salvar fábrica', '保存工厂时出错'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setError(null);
    // Limpar estado das imagens
    setImageUrls({ image1: '', image2: '' });
    setUploadingImages({ image1: false, image2: false });
    resetFactoryTags();
  };

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

  const addNewTagToFactory = (division) => {
    const tagName = newTagInputs[division].trim();
    if (!tagName) return;

    console.log('=== ADD NEW TAG TO FACTORY ===');
    console.log('Division:', division);
    console.log('Tag name:', tagName);
    console.log('Current factory tags:', factoryTags);

    const newTag = {
      id: Date.now().toString(),
      name: tagName,
      division: division,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('New tag created:', newTag);

    // Adicionar ao serviço global de tags
    const result = tagService.addTag(newTag);
    console.log('Add tag result:', result);
    
    if (result.success) {
      // Adicionar à fábrica atual
      console.log('Adding tag to factory...');
      addTagToFactory(newTag, division);
      console.log('Tag added to factory. New factory tags:', factoryTags);
      
      // Atualizar tags disponíveis
      loadAvailableTags();
    } else {
      console.error('Failed to add tag:', result.message);
      setError(result.message);
    }

    // Limpar input
    setNewTagInputs(prev => ({
      ...prev,
      [division]: ''
    }));
  };

  // Função para adicionar tag disponível à fábrica
  const addAvailableTagToFactory = (tag) => {
    addTagToFactory(tag, tag.division);
    
    // Remover da lista de disponíveis
    setAvailableTags(prev => ({
      ...prev,
      [tag.division]: prev[tag.division].filter(t => t.id !== tag.id)
    }));
  };

  const resetFactoryTags = () => {
    setFactoryTags({
      regiao: [],
      material: [],
      outros: []
    });
    setNewTagInputs({
      regiao: '',
      material: '',
      outros: ''
    });
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-primary text-white p-3 rounded mb-3">
        <h2 className="mb-0 fs-5 fw-semibold">{t('ProductMobile Ravi', '产品移动端拉维')}</h2>
      </div>
      
      {error && (
        <Alert variant="danger" className="mb-3">
          <Alert.Heading>{t('Erro', '错误')}</Alert.Heading>
          {error}
        </Alert>
      )}

      <Row className="g-3">
        <Col xs={12}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                  <i className="bi bi-shop me-2 text-success fs-5"></i>
                  <span className="fw-medium">{t('Fábricas Cadastradas', '已注册工厂')}</span>
                </div>
                <div className="fs-3 fw-bold text-success">
                  {allFactories.length}
                </div>
              </div>
              
              {/* Caixa de seleção de fábricas */}
              <div className="mb-3">
                <div className="d-flex align-items-center mb-2 text-muted small">
                  <i className="bi bi-list-ul me-1"></i>
                  {t('Selecionar Fábrica:', '选择工厂:')}
                </div>
                <Form.Select
                  value={selectedFactory}
                  onChange={(e) => {
                    const factoryId = e.target.value;
                    setSelectedFactory(factoryId);
                    if (factoryId) {
                      // Redirecionar automaticamente para a página da fábrica
                      handleFactorySelect(factoryId);
                    }
                  }}
                  size="sm"
                >
                  <option value="">{t('Escolha uma fábrica...', '选择工厂...')}</option>
                  {allFactories.map((factory) => (
                    <option key={factory.id} value={factory.id}>
                      {factory.name} - {factory.segment || t('Sem segmento', '无行业')}
                    </option>
                  ))}
                </Form.Select>
              </div>

              <div className="d-flex gap-2">
                <Button 
                  variant="primary"
                  onClick={() => setModalVisible(true)}
                  className="flex-grow-1"
                  size="lg"
                  style={{ fontSize: '18px' }}
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  {t('Fábrica', '工厂/商店')}
                </Button>
                <Button 
                  variant="outline-secondary"
                  onClick={() => navigate('/tags')}
                  className="flex-grow-1"
                  size="lg"
                  style={{ fontSize: '18px' }}
                >
                  <i className="bi bi-tags me-2"></i>
                  {t('Gerenciar Tags', '管理标签')}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal para cadastrar fábrica */}
      <Modal show={modalVisible} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('Nova Fábrica/Loja', '新建工厂/商店')}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const values = Object.fromEntries(formData.entries());
          handleSubmit(values);
        }}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>{t('Nome da Fábrica/Loja', '工厂/商店名称')}</Form.Label>
              <Form.Control
                type="text"
                name="name"
                placeholder={t('Digite o nome da fábrica/loja', '输入工厂/商店名称')}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Nome do Contato', '联系人姓名')}</Form.Label>
              <Form.Control
                type="text"
                name="contactName"
                placeholder={t('Digite o nome do contato', '输入联系人姓名')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Telefone', '电话')}</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                placeholder={t('Digite o telefone', '输入电话号码')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('WeChat', '微信')}</Form.Label>
              <Form.Control
                type="text"
                name="wechat"
                placeholder={t('Digite o WeChat', '输入微信号')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('E-mail', '邮箱')}</Form.Label>
              <Form.Control
                type="email"
                name="email"
                placeholder={t('Digite o e-mail', '输入邮箱地址')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Localização', '位置')}</Form.Label>
              <Form.Control
                type="text"
                name="location"
                placeholder={t('Digite a localização', '输入位置')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Segmento', '行业')}</Form.Label>
              <Form.Control
                type="text"
                name="segment"
                placeholder={t('Digite o segmento de atuação', '输入行业领域')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Descrição', '描述')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                placeholder={t('Digite uma descrição', '输入描述')}
              />
            </Form.Group>

            {/* Campos de Tags */}
            <Row className="mb-3">
              <Col xs={12}>
                <h6 className="text-primary mb-3">{t('Tags da Fábrica', '工厂标签')}</h6>
              </Col>
            </Row>

            {/* Tags Região */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Tags Região', '地区标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {factoryTags.regiao.map(tag => (
                  <Badge 
                    key={tag.id} 
                    bg="primary" 
                    className="d-flex align-items-center gap-1"
                    style={{ cursor: 'pointer' }}
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
                />
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => addNewTagToFactory('regiao')}
                  disabled={!newTagInputs.regiao.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
            </Form.Group>

            {/* Tags Material */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Tags Material', '材料标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {factoryTags.material.map(tag => (
                  <Badge 
                    key={tag.id} 
                    bg="success" 
                    className="d-flex align-items-center gap-1"
                    style={{ cursor: 'pointer' }}
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
                />
                <Button 
                  variant="outline-success" 
                  size="sm"
                  onClick={() => addNewTagToFactory('material')}
                  disabled={!newTagInputs.material.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
            </Form.Group>

            {/* Tags Outros */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Tags Outros', '其他标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {factoryTags.outros.map(tag => (
                  <Badge 
                    key={tag.id} 
                    bg="warning" 
                    className="d-flex align-items-center gap-1"
                    style={{ cursor: 'pointer' }}
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
                />
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={() => addNewTagToFactory('outros')}
                  disabled={!newTagInputs.outros.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
            </Form.Group>

            {/* Tags Disponíveis */}
            <Row className="mb-3">
              <Col xs={12}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-success mb-0">{t('Tags Disponíveis', '可用标签')}</h6>
                  <Button 
                    variant="outline-success" 
                    size="sm"
                    onClick={() => setShowAvailableTags(!showAvailableTags)}
                  >
                    {showAvailableTags ? t('Ocultar', '隐藏') : t('Mostrar', '显示')}
                  </Button>
                </div>
                
                {showAvailableTags && (
                  <div className="border rounded p-3 bg-light">
                    {/* Tags Região Disponíveis */}
                    {availableTags && availableTags.regiao && availableTags.regiao.length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-primary small">{t('Região', '地区')}</h6>
                        <div className="d-flex flex-wrap gap-2">
                          {availableTags.regiao.map(tag => (
                            <Badge 
                              key={tag.id} 
                              bg="primary" 
                              className="d-flex align-items-center gap-1"
                              style={{ cursor: 'pointer' }}
                              onClick={() => addAvailableTagToFactory(tag)}
                            >
                              {tag.name}
                              <i className="bi bi-plus"></i>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags Material Disponíveis */}
                    {availableTags && availableTags.material && availableTags.material.length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-success small">{t('Material', '材料')}</h6>
                        <div className="d-flex flex-wrap gap-2">
                          {availableTags.material.map(tag => (
                            <Badge 
                              key={tag.id} 
                              bg="success" 
                              className="d-flex align-items-center gap-1"
                              style={{ cursor: 'pointer' }}
                              onClick={() => addAvailableTagToFactory(tag)}
                            >
                              {tag.name}
                              <i className="bi bi-plus"></i>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags Outros Disponíveis */}
                    {availableTags && availableTags.outros && availableTags.outros.length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-warning small">{t('Outros', '其他')}</h6>
                        <div className="d-flex flex-wrap gap-2">
                          {availableTags.outros.map(tag => (
                            <Badge 
                              key={tag.id} 
                              bg="warning" 
                              className="d-flex align-items-center gap-1"
                              style={{ cursor: 'pointer' }}
                              onClick={() => addAvailableTagToFactory(tag)}
                            >
                              {tag.name}
                              <i className="bi bi-plus"></i>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {availableTags && availableTags.regiao && availableTags.material && availableTags.outros && 
                     availableTags.regiao.length === 0 && availableTags.material.length === 0 && availableTags.outros.length === 0 && (
                      <p className="text-muted text-center mb-0">{t('Nenhuma tag disponível', '没有可用标签')}</p>
                    )}
                  </div>
                )}
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>{t('Imagem Principal', '主图片')}</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                name="image1"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      setUploadingImages(prev => ({ ...prev, image1: true }));
                      const imageUrl = await imageService.uploadFile(file);
                      console.log('Imagem principal enviada:', imageUrl);
                      setImageUrls(prev => ({ ...prev, image1: imageUrl }));
                    } catch (error) {
                      console.error('Erro no upload da imagem:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    } finally {
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
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Imagem Secundária', '副图片')}</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                name="image2"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      setUploadingImages(prev => ({ ...prev, image2: true }));
                      const imageUrl = await imageService.uploadFile(file);
                      console.log('Imagem secundária enviada:', imageUrl);
                      setImageUrls(prev => ({ ...prev, image2: imageUrl }));
                    } catch (error) {
                      console.error('Erro no upload da imagem secundária:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    } finally {
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
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose} style={{ fontSize: '18px' }}>
              {t('Cancelar', '取消')}
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={submitting || uploadingImages.image1 || uploadingImages.image2}
              style={{ fontSize: '18px' }}
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
                t('Criar', '创建')
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de preview da imagem */}
      <Modal show={previewVisible} onHide={() => setPreviewVisible(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{t('Visualizar Imagem', '查看图片')}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <img
            src={previewImage}
            alt="Preview"
            className="img-fluid rounded"
            style={{ maxHeight: '70vh' }}
          />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Dashboard;
