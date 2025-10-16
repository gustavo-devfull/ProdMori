import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Row,
  Col,
  Alert,
  Spinner,
  Badge
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import factoryServiceAPI from '../services/factoryServiceAPI';
import productServiceAPI from '../services/productServiceAPI';
import imageService from '../services/imageService';
import tagService from '../services/tagService';
import AudioRecorder from '../components/AudioRecorder';
import AudioPlayer from '../components/AudioPlayer';
import audioUploadService from '../services/audioUploadService';
import CustomImage from '../components/CustomImage';
import { useLanguage } from '../contexts/LanguageContext';

const FactoryDetail = () => {
  const { factoryId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [factory, setFactory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [factoryEditModalVisible, setFactoryEditModalVisible] = useState(false);
  const [factorySubmitting, setFactorySubmitting] = useState(false);
  const [factoryTags, setFactoryTags] = useState({
    regiao: [],
    material: [],
    outros: []
  });
  const [factoryNewTagInputs, setFactoryNewTagInputs] = useState({
    regiao: '',
    material: '',
    outros: ''
  });
  const [globalTags, setGlobalTags] = useState({
    regiao: [],
    material: [],
    outros: []
  });
  const [uploadingImages, setUploadingImages] = useState({ image1: false, image2: false });
  const [imageUrls, setImageUrls] = useState({ image1: '', image2: '' });
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
  const [factoryTagsDisplay, setFactoryTagsDisplay] = useState({
    regiao: [],
    material: [],
    outros: []
  });
  const [audioUrls, setAudioUrls] = useState([]);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [lastUploadedAudioUrl, setLastUploadedAudioUrl] = useState('');

  const loadFactoryData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Carregar dados da fábrica
      const factoryData = await factoryServiceAPI.getFactoryById(factoryId);
      if (!factoryData) {
        setError(t('Fábrica não encontrada', '工厂未找到'));
        return;
      }
      
      setFactory(factoryData);
      
      // Carregar produtos da fábrica
      const productsData = await factoryServiceAPI.getProductsByFactory(factoryId);
      setProducts(productsData);
      
      setError(null);
    } catch (err) {
      setError(t('Erro ao carregar dados da fábrica', '加载工厂数据时出错'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [factoryId, t]);

  // Função para carregar tags da fábrica para exibição
  const loadFactoryTagsForDisplay = useCallback(() => {
    try {
      const savedTags = localStorage.getItem(`tags_${factoryId}`);
      if (savedTags) {
        setFactoryTagsDisplay(JSON.parse(savedTags));
      } else {
        setFactoryTagsDisplay({ regiao: [], material: [], outros: [] });
      }
    } catch (error) {
      console.error('Erro ao carregar tags da fábrica para exibição:', error);
    }
  }, [factoryId]);

  useEffect(() => {
    loadFactoryData();
    loadFactoryTagsForDisplay();
  }, [loadFactoryData, loadFactoryTagsForDisplay]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData.entries());
    
    try {
      setSubmitting(true);
      
      // Usar a URL da imagem do estado se disponível
      const finalValues = {
        ...values,
        imageUrl: imageUrl || values.imageUrl,
        audioUrls: audioUrls, // Incluir lista de URLs de áudio
        factoryId: factoryId,
        unit: 'PC' // Valor padrão conforme solicitado
      };
      
      if (editingProduct) {
        await productServiceAPI.updateProduct(editingProduct.id, finalValues);
      } else {
        await productServiceAPI.createProduct(finalValues);
      }
      
      setModalVisible(false);
      setEditingProduct(null);
      setImageUrl('');
      await loadFactoryData();
    } catch (err) {
      setError(t('Erro ao salvar produto', '保存产品时出错'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    console.log('=== HANDLE MODAL CLOSE ===');
    console.log('Current modalVisible:', modalVisible);
    console.log('Current editingProduct:', editingProduct);
    
    setModalVisible(false);
    setEditingProduct(null);
    setError(null);
    setImageUrl('');
    setUploadingImage(false);
    setAudioUrls([]);
    setUploadingAudio(false);
    setLastUploadedAudioUrl('');
    
    console.log('Modal close states updated');
  };

  const handlePreview = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  // Função para lidar com áudio gravado
  const handleAudioReady = async (blob, url) => {
    if (blob && editingProduct) {
      try {
        setUploadingAudio(true);
        const result = await audioUploadService.uploadAudio(blob, editingProduct.id);
        
        if (result.success) {
          // Adicionar novo áudio à lista
          setAudioUrls(prev => [...prev, result.audioUrl]);
          setLastUploadedAudioUrl(result.audioUrl);
          console.log('Áudio enviado com sucesso:', result);
        }
      } catch (error) {
        console.error('Erro ao enviar áudio:', error);
        setError(t('Erro ao enviar áudio', '发送音频时出错'));
      } finally {
        setUploadingAudio(false);
      }
    }
  };

  // Função para deletar áudio da lista
  const handleDeleteAudio = (index) => {
    setAudioUrls(prev => prev.filter((_, i) => i !== index));
  };


  const handleDeleteProduct = async (productId) => {
    console.log('=== HANDLE DELETE PRODUCT ===');
    console.log('Product ID:', productId);
    console.log('Current editingProduct:', editingProduct);
    console.log('Current modalVisible:', modalVisible);
    console.log('Current submitting:', submitting);
    
    if (!window.confirm(t('Tem certeza que deseja excluir este produto?', '确定要删除这个产品吗？'))) {
      console.log('User cancelled deletion');
      return;
    }

    try {
      console.log('Starting product deletion...');
      setSubmitting(true);
      
      console.log('Calling productServiceAPI.deleteProduct...');
      await productServiceAPI.deleteProduct(productId);
      console.log('Product deleted successfully');
      
      console.log('Reloading factory data...');
      await loadFactoryData();
      console.log('Factory data reloaded');
      
      setError(null);
      
      // Fechar modal imediatamente após sucesso
      console.log('Force closing modal immediately...');
      setModalVisible(false);
      setEditingProduct(null);
      setSubmitting(false);
      
      console.log('Modal should be closed now');
      
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(t('Erro ao excluir produto', '删除产品时出错'));
      
      // Fechar modal mesmo em caso de erro
      console.log('Closing modal due to error...');
      setModalVisible(false);
      setEditingProduct(null);
      setSubmitting(false);
    }
  };


  // Funções para gerenciar edição da fábrica
  const handleEditFactory = async () => {
    setFactoryEditModalVisible(true);
    // Inicializar URLs das imagens para edição
    setImageUrls({
      image1: factory.imageUrl1 || '',
      image2: factory.imageUrl2 || ''
    });
    
    // Carregar tags da fábrica
    const savedTags = localStorage.getItem(`tags_${factoryId}`);
    if (savedTags) {
      setFactoryTags(JSON.parse(savedTags));
    } else {
      setFactoryTags({ regiao: [], material: [], outros: [] });
    }
    
    // Recarregar tags globais
    console.log('=== CARREGANDO TAGS GLOBAIS ===');
    try {
      const globalTagsData = await tagService.getAllTags();
      console.log('Tags globais carregadas:', globalTagsData);
      setGlobalTags(globalTagsData);
    } catch (error) {
      console.error('Erro ao carregar tags globais:', error);
      // Fallback para localStorage
      const localGlobalTags = JSON.parse(localStorage.getItem('globalTags') || '{"regiao":[],"material":[],"outros":[]}');
      console.log('Usando tags globais do localStorage:', localGlobalTags);
      setGlobalTags(localGlobalTags);
    }
  };

  const handleFactoryModalClose = () => {
    setFactoryEditModalVisible(false);
    setError(null);
    // Limpar estado das imagens
    setImageUrls({ image1: '', image2: '' });
    setUploadingImages({ image1: false, image2: false });
    resetFactoryTags();
    setShowAdditionalFields(false);
  };

  const handleFactorySubmit = async (values) => {
    try {
      setFactorySubmitting(true);
      
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
      
      await factoryServiceAPI.updateFactory(factoryId, finalValues);
      
      // Salvar as tags da fábrica usando o serviço
      Object.keys(factoryTags).forEach(division => {
        factoryTags[division].forEach(tag => {
          tagService.addTagToFactory(factoryId, tag);
        });
      });
      
      // Sincronizar tags globais após salvar
      tagService.syncGlobalTags();
      
      setFactoryEditModalVisible(false);
      await loadFactoryData();
      loadFactoryTagsForDisplay();
    } catch (err) {
      setError(t('Erro ao salvar fábrica', '保存工厂时出错'));
      console.error(err);
    } finally {
      setFactorySubmitting(false);
    }
  };

  const handleDeleteFactory = async () => {
    if (!factoryId) return;
    
    const confirmMessage = t(
      'Tem certeza que deseja excluir esta fábrica? Esta ação não pode ser desfeita.',
      '确定要删除这个工厂吗？此操作无法撤销。'
    );
    
    if (window.confirm(confirmMessage)) {
      try {
        await factoryServiceAPI.deleteFactory(factoryId);
        console.log('Fábrica excluída com sucesso');
        
        // Redirecionar para a página de fábricas
        navigate('/factories');
      } catch (error) {
        console.error('Erro ao excluir fábrica:', error);
        alert(t('Erro ao excluir fábrica', '删除工厂时出错'));
      }
    }
  };

  // Funções para gerenciar tags da fábrica
  const addTagToFactory = (tag, division) => {
    setFactoryTags(prev => {
      // Verificar se a tag já existe na divisão
      const existingTag = prev[division].find(t => t.id === tag.id || t.name === tag.name);
      if (existingTag) {
        console.log('Tag já existe na fábrica:', tag.name);
        return prev; // Não adicionar se já existe
      }
      
      console.log('Adicionando tag à fábrica:', tag.name, 'na divisão:', division);
      return {
        ...prev,
        [division]: [...prev[division], tag]
      };
    });
  };

  const removeTagFromFactory = (tagId, division) => {
    console.log('Removendo tag da fábrica:', tagId, 'da divisão:', division);
    setFactoryTags(prev => ({
      ...prev,
      [division]: prev[division].filter(tag => tag.id !== tagId)
    }));
  };

  const addNewTagToFactory = async (division) => {
    const tagName = factoryNewTagInputs[division].trim();
    if (!tagName) return;

    const newTag = {
      id: Date.now().toString(),
      name: tagName,
      division: division,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Adicionar ao serviço global de tags
    const result = tagService.addTag(newTag);
    if (result.success) {
      // Adicionar à fábrica atual
      addTagToFactory(newTag, division);
      
      // Atualizar tags globais disponíveis
      const globalTagsData = await tagService.getAllTags();
      setGlobalTags(globalTagsData);
    } else {
      console.warn('Tag já existe globalmente:', result.message);
      // Mesmo assim, adicionar à fábrica atual
      addTagToFactory(newTag, division);
    }

    // Limpar input
    setFactoryNewTagInputs(prev => ({
      ...prev,
      [division]: ''
    }));
  };

  const addGlobalTagToFactory = (tag, division) => {
    console.log('=== ADD GLOBAL TAG TO FACTORY ===');
    console.log('Tag:', tag);
    console.log('Division:', division);
    console.log('Current factory tags:', factoryTags[division]);
    
    // Verificar se a tag já existe na fábrica (por ID ou nome)
    const existingTag = factoryTags[division].find(t => t.id === tag.id || t.name === tag.name);
    if (existingTag) {
      console.log('Tag já existe na fábrica:', tag.name);
      return;
    }

    console.log('Adicionando tag global à fábrica:', tag.name);
    // Adicionar a tag à fábrica
    addTagToFactory(tag, division);
  };

  const resetFactoryTags = () => {
    setFactoryTags({
      regiao: [],
      material: [],
      outros: []
    });
    setFactoryNewTagInputs({
      regiao: '',
      material: '',
      outros: ''
    });
  };

  // Função para renderizar tags da fábrica
  const renderFactoryTags = () => {
    // Verificar se factoryTagsDisplay é válido
    if (!factoryTagsDisplay || typeof factoryTagsDisplay !== 'object') {
      return null;
    }
    
    const allFactoryTags = [];
    
    // Combinar todas as tags da fábrica
    if (factoryTagsDisplay.regiao && Array.isArray(factoryTagsDisplay.regiao) && factoryTagsDisplay.regiao.length > 0) {
      allFactoryTags.push(...factoryTagsDisplay.regiao.map(tag => ({ ...tag, type: 'regiao' })));
    }
    
    if (factoryTagsDisplay.material && Array.isArray(factoryTagsDisplay.material) && factoryTagsDisplay.material.length > 0) {
      allFactoryTags.push(...factoryTagsDisplay.material.map(tag => ({ ...tag, type: 'material' })));
    }
    
    if (factoryTagsDisplay.outros && Array.isArray(factoryTagsDisplay.outros) && factoryTagsDisplay.outros.length > 0) {
      allFactoryTags.push(...factoryTagsDisplay.outros.map(tag => ({ ...tag, type: 'outros' })));
    }
    
    if (allFactoryTags.length === 0) return null;
    
    return (
      <div className="mb-4">
        <div className="d-flex flex-wrap gap-2">
          {allFactoryTags.map(tag => (
            <Badge 
              key={tag.id} 
              bg={tag.type === 'regiao' ? 'primary' : tag.type === 'material' ? 'success' : 'danger'}
              className="d-flex align-items-center gap-1"
              style={{ fontSize: '14px' }}
            >
              <i className={`bi ${tag.type === 'regiao' ? 'bi-geo-alt' : tag.type === 'material' ? 'bi-box' : 'bi-tag'}`}></i>
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>
    );
  };


  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="lg" />
      </div>
    );
  }

  if (!factory) {
    return (
      <div className="text-center py-5">
        <Alert variant="danger">
          <Alert.Heading>{t('Erro', '错误')}</Alert.Heading>
          {error || t('Fábrica não encontrada', '工厂未找到')}
        </Alert>
        <Button variant="primary" onClick={() => navigate('/')}>
          {t('Voltar ao Dashboard', '返回仪表板')}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-primary text-white p-3 rounded mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-3">
            <Button 
              variant="outline-light"
              size="sm"
              onClick={handleEditFactory}
              className="d-flex align-items-center"
              title={t('Editar fábrica', '编辑工厂')}
            >
              <i className="bi bi-pencil me-1"></i>
              {t('Editar', '编辑')}
            </Button>
            <Button 
              variant="danger"
              size="sm"
              onClick={() => setModalVisible(true)}
              className="d-flex align-items-center"
            >
              <i className="bi bi-plus-circle me-1"></i>
              {t('Cadastrar Produto', '注册产品')}
            </Button>
          </div>
          <Button 
            variant="light"
            size="sm"
            onClick={() => navigate('/')}
            className="d-flex align-items-center"
          >
            <i className="bi bi-arrow-left me-1"></i>
            {t('Voltar', '返回')}
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Card principal da fábrica */}
      <Card className="mb-4">
        <Card.Body>
          <div className="mb-3">
            <h4 className="mb-0">{factory.name}</h4>
          </div>

          {/* Tags da fábrica */}
          {renderFactoryTags()}

          {/* Imagens da fábrica */}
          {(factory.imageUrl1 || factory.imageUrl2) && (
            <div className="mb-4">
              <Row className="g-2">
                {factory.imageUrl1 && (
                  <Col xs={6}>
                    <CustomImage
                      src={factory.imageUrl1}
                      alt={`${factory.name} - Imagem 1`}
                      className="img-fluid rounded"
                      style={{ height: '180px', objectFit: 'cover', width: '100%' }}
                      showPreview={true}
                      onPreview={handlePreview}
                    />
                  </Col>
                )}
                {factory.imageUrl2 && (
                  <Col xs={6}>
                    <CustomImage
                      src={factory.imageUrl2}
                      alt={`${factory.name} - Imagem 2`}
                      className="img-fluid rounded"
                      style={{ height: '180px', objectFit: 'cover', width: '100%' }}
                      showPreview={true}
                      onPreview={handlePreview}
                    />
                  </Col>
                )}
              </Row>
            </div>
          )}

          {/* Listagem dos produtos */}
          <div>
            <h5 className="mb-3">{t('Produtos Cadastrados', '已注册产品')}</h5>
            {!products || products.length === 0 ? (
              <div className="text-center py-4">
                <i className="bi bi-bag text-muted fs-1"></i>
                <p className="text-muted mt-2">{t('Nenhum produto cadastrado', '没有注册产品')}</p>
              </div>
            ) : (
              <Row className="g-3">
                {products.map((product) => (
                  <Col xs={12} md={6} lg={4} key={product.id}>
                    <Card className="h-100">
                      <Card.Body className="p-3">
                        <Row className="align-items-center">
                          {/* Foto do produto */}
                          <Col xs={4}>
                            <div className="d-flex justify-content-center">
                              {product.imageUrl ? (
                                <CustomImage
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="img-fluid rounded"
                                  style={{ 
                                    width: '120px', 
                                    height: '120px', 
                                    objectFit: 'cover',
                                    cursor: 'pointer'
                                  }}
                                  showPreview={true}
                                  onPreview={handlePreview}
                                />
                              ) : (
                                <div 
                                  className="d-flex align-items-center justify-content-center rounded bg-light"
                                  style={{ 
                                    width: '120px', 
                                    height: '120px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handlePreview('')}
                                >
                                  <i className="bi bi-image text-muted fs-2"></i>
                                </div>
                              )}
                            </div>
                          </Col>
                          
                          {/* Informações do produto */}
                          <Col xs={8}>
                            <div className="d-flex flex-column h-100">
                              <div className="mb-2">
                                <div className="fw-medium text-truncate">
                                  {product.name || t('Sem nome', '无名称')}
                                </div>
                                <div className="text-primary fw-bold">
                                  ¥ {product.uPrice || t('Sob consulta', '咨询价格')}
                                </div>
                              </div>
                              
                              {/* Segmento e botões de ação */}
                              <div className="mt-auto d-flex align-items-center justify-content-between">
                                <div className="text-muted small">
                                  {product.segment || t('Sem segmento', '无行业')}
                                </div>
                                <div className="d-flex gap-1">
                                  <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('Edit button clicked from card');
                                      setEditingProduct(product);
                                      setModalVisible(true);
                                      setImageUrl(product.imageUrl || '');
                                      // Carregar áudios existentes (pode ser array ou string única)
                                      const existingAudios = product.audioUrls || (product.audioUrl ? [product.audioUrl] : []);
                                      setAudioUrls(Array.isArray(existingAudios) ? existingAudios : []);
                                    }}
                                    title={t('Editar produto', '编辑产品')}
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </Button>
                                  <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('Delete button clicked from card, submitting:', submitting);
                                      if (!submitting) {
                                        handleDeleteProduct(product.id);
                                      }
                                    }}
                                    disabled={submitting}
                                    title={t('Excluir produto', '删除产品')}
                                  >
                                    <i className="bi bi-trash"></i>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Modal para cadastrar produto */}
      <Modal show={modalVisible} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingProduct ? t('Editar Produto', '编辑产品') : t('Cadastrar Produto', '注册产品')}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {/* Botão salvar no topo */}
            <div className="d-flex justify-content-end mb-3">
              <Button 
                variant="success" 
                type="submit" 
                disabled={submitting || uploadingImage}
                className="d-flex align-items-center"
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('Salvando...', '保存中...')}
                  </>
                ) : uploadingImage ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('Enviando imagem...', '上传图片中...')}
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1"></i>
                    {t('Salvar', '保存')}
                  </>
                )}
              </Button>
            </div>

            {/* Nome da Fábrica */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Nome da Fábrica', '工厂名称')}</Form.Label>
              <Form.Control
                type="text"
                value={factory.name}
                disabled
                className="bg-light"
              />
            </Form.Group>

            {/* Foto do produto */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Foto do produto', '产品照片')}</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      setUploadingImage(true);
                      const uploadedImageUrl = await imageService.uploadFile(file);
                      setImageUrl(uploadedImageUrl);
                    } catch (error) {
                      console.error('Erro no upload da imagem:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    } finally {
                      setUploadingImage(false);
                    }
                  }
                }}
              />
              {imageUrl && (
                <div className="mt-2">
                  <CustomImage
                    src={imageUrl}
                    alt="Preview"
                    className="img-fluid rounded"
                    style={{ maxHeight: '200px', maxWidth: '100%' }}
                    showPreview={true}
                    onPreview={handlePreview}
                  />
                </div>
              )}
              <Form.Control
                type="hidden"
                name="imageUrl"
                value={imageUrl}
              />
            </Form.Group>

            {/* Nome do produto */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Nome do produto', '产品名称')}</Form.Label>
              <Form.Control
                type="text"
                name="name"
                defaultValue={editingProduct?.name || ''}
                placeholder={t('Digite o nome do produto', '输入产品名称')}
                required
              />
            </Form.Group>

            {/* Segmento */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Segmento', '行业')}</Form.Label>
              <Form.Control
                type="text"
                name="segment"
                defaultValue={editingProduct?.segment || ''}
                placeholder={t('Digite o segmento', '输入行业')}
              />
            </Form.Group>

            {/* REF */}
            <Form.Group className="mb-3">
              <Form.Label>{t('REF', '参考号')}</Form.Label>
              <Form.Control
                type="text"
                name="ref"
                defaultValue={editingProduct?.ref || ''}
                placeholder={t('Digite a referência', '输入参考号')}
              />
            </Form.Group>

            {/* Áudio (substitui REMARK) */}
            <AudioRecorder 
              onAudioReady={handleAudioReady}
              initialAudioUrl={lastUploadedAudioUrl}
              disabled={uploadingAudio}
            />
            
            <AudioPlayer 
              audioUrls={audioUrls}
              onDelete={handleDeleteAudio}
              disabled={uploadingAudio}
            />
            
            {uploadingAudio && (
              <div className="text-center mb-3">
                <Spinner animation="border" size="sm" className="me-2" />
                <span className="text-muted">{t('Enviando áudio...', '发送音频中...')}</span>
              </div>
            )}

            {/* U.PRICE | UNIT */}
            <Row className="mb-3">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>{t('U.PRICE', '单价')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="uPrice"
                    defaultValue={editingProduct?.uPrice || ''}
                    placeholder={t('Digite o preço unitário', '输入单价')}
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>{t('UNIT', '单位')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="unit"
                    defaultValue={editingProduct?.unit || 'PC'}
                    placeholder={t('Digite a unidade', '输入单位')}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* UNIT/CTNS | CBM */}
            <Row className="mb-3">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>{t('UNIT/CTNS', '每箱单位')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="unitCtn"
                    defaultValue={editingProduct?.unitCtn || ''}
                    placeholder={t('Digite unidades por caixa', '输入每箱单位')}
                  />
                </Form.Group>
              </Col>
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>{t('CBM', 'CBM')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="cbm"
                    defaultValue={editingProduct?.cbm || ''}
                    placeholder={t('Digite o CBM', '输入CBM')}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* L | W | H */}
            <Row className="mb-3">
              <Col xs={4}>
                <Form.Group>
                  <Form.Label>{t('L', 'L')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="l"
                    defaultValue={editingProduct?.l || ''}
                    placeholder={t('Comprimento', '长度')}
                  />
                </Form.Group>
              </Col>
              <Col xs={4}>
                <Form.Group>
                  <Form.Label>{t('W', 'W')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="w"
                    defaultValue={editingProduct?.w || ''}
                    placeholder={t('Largura', '宽度')}
                  />
                </Form.Group>
              </Col>
              <Col xs={4}>
                <Form.Group>
                  <Form.Label>{t('H', 'H')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="h"
                    defaultValue={editingProduct?.h || ''}
                    placeholder={t('Altura', '高度')}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* G.W */}
            <Form.Group className="mb-3">
              <Form.Label>{t('G.W', 'G.W')}</Form.Label>
              <Form.Control
                type="text"
                name="gW"
                defaultValue={editingProduct?.gW || ''}
                placeholder={t('Digite o peso bruto', '输入毛重')}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose}>
              {t('Cancelar', '取消')}
            </Button>
            {editingProduct && (
              <Button 
                variant="danger" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Delete button clicked, submitting:', submitting);
                  if (!submitting) {
                    handleDeleteProduct(editingProduct.id);
                  }
                }}
                disabled={submitting}
                className="me-auto"
              >
                <i className="bi bi-trash me-1"></i>
                {t('Excluir Produto', '删除产品')}
              </Button>
            )}
            <Button 
              variant="success" 
              type="submit" 
              disabled={submitting || uploadingImage}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Salvando...', '保存中...')}
                </>
              ) : uploadingImage ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Enviando imagem...', '上传图片中...')}
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-1"></i>
                  {t('Salvar', '保存')}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal para editar fábrica */}
      <Modal show={factoryEditModalVisible} onHide={handleFactoryModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {t('Editar Fábrica/Loja', '编辑工厂/商店')}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const values = Object.fromEntries(formData.entries());
          handleFactorySubmit(values);
        }}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>{t('Nome da Fábrica/Loja', '工厂/商店名称')}</Form.Label>
              <Form.Control
                type="text"
                name="name"
                defaultValue={factory?.name || ''}
                placeholder={t('Digite o nome da fábrica/loja', '输入工厂/商店名称')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Nome do Contato', '联系人姓名')}</Form.Label>
              <Form.Control
                type="text"
                name="contactName"
                defaultValue={factory?.contactName || ''}
                placeholder={t('Digite o nome do contato', '输入联系人姓名')}
              />
            </Form.Group>

            {/* Botão para mostrar/ocultar campos adicionais */}
            <div className="d-flex justify-content-center mb-3">
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setShowAdditionalFields(!showAdditionalFields)}
                className="d-flex align-items-center"
              >
                <i className={`bi ${showAdditionalFields ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
                {showAdditionalFields ? t('Ocultar campos adicionais', '隐藏额外字段') : t('Mostrar campos adicionais', '显示额外字段')}
              </Button>
            </div>

            {/* Campos adicionais */}
            {showAdditionalFields && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>{t('Telefone', '电话')}</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    defaultValue={factory?.phone || ''}
                    placeholder={t('Digite o telefone', '输入电话号码')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('WeChat', '微信')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="wechat"
                    defaultValue={factory?.wechat || ''}
                    placeholder={t('Digite o WeChat', '输入微信号')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('E-mail', '邮箱')}</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    defaultValue={factory?.email || ''}
                    placeholder={t('Digite o e-mail', '输入邮箱地址')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('Localização', '位置')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="location"
                    defaultValue={factory?.location || ''}
                    placeholder={t('Digite a localização', '输入位置')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('Segmento', '行业')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="segment"
                    defaultValue={factory?.segment || ''}
                    placeholder={t('Digite o segmento de atuação', '输入行业领域')}
                  />
                </Form.Group>
              </>
            )}

            <Form.Group className="mb-3">
              <Form.Label>{t('Descrição', '描述')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                defaultValue={factory?.description || ''}
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
                  value={factoryNewTagInputs.regiao}
                  onChange={(e) => setFactoryNewTagInputs(prev => ({ ...prev, regiao: e.target.value }))}
                />
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => addNewTagToFactory('regiao')}
                  disabled={!factoryNewTagInputs.regiao.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Região */}
              {globalTags && globalTags.regiao && globalTags.regiao.length > 0 && (
                <div className="mt-2">
                  <small className="text-muted d-block mb-2">{t('Tags Globais Disponíveis', '可用全局标签')}:</small>
                  <div className="d-flex flex-wrap gap-1">
                    {globalTags.regiao.map(tag => {
                      const isAlreadyAdded = factoryTags.regiao.some(t => t.id === tag.id);
                      return (
                        <Badge 
                          key={tag.id} 
                          bg="secondary" 
                          className="d-flex align-items-center gap-1"
                          style={{ 
                            cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                            opacity: isAlreadyAdded ? 0.5 : 1,
                            fontSize: '14px'
                          }}
                          onClick={() => !isAlreadyAdded && addGlobalTagToFactory(tag, 'regiao')}
                          title={isAlreadyAdded ? t('Já adicionada', '已添加') : t('Clique para adicionar', '点击添加')}
                        >
                          {tag.name}
                          {!isAlreadyAdded && <i className="bi bi-plus"></i>}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
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
                  value={factoryNewTagInputs.material}
                  onChange={(e) => setFactoryNewTagInputs(prev => ({ ...prev, material: e.target.value }))}
                />
                <Button 
                  variant="outline-success" 
                  size="sm"
                  onClick={() => addNewTagToFactory('material')}
                  disabled={!factoryNewTagInputs.material.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Material */}
              {globalTags && globalTags.material && globalTags.material.length > 0 && (
                <div className="mt-2">
                  <small className="text-muted d-block mb-2">{t('Tags Globais Disponíveis', '可用全局标签')}:</small>
                  <div className="d-flex flex-wrap gap-1">
                    {globalTags.material.map(tag => {
                      const isAlreadyAdded = factoryTags.material.some(t => t.id === tag.id);
                      return (
                        <Badge 
                          key={tag.id} 
                          bg="secondary" 
                          className="d-flex align-items-center gap-1"
                          style={{ 
                            cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                            opacity: isAlreadyAdded ? 0.5 : 1,
                            fontSize: '14px'
                          }}
                          onClick={() => !isAlreadyAdded && addGlobalTagToFactory(tag, 'material')}
                          title={isAlreadyAdded ? t('Já adicionada', '已添加') : t('Clique para adicionar', '点击添加')}
                        >
                          {tag.name}
                          {!isAlreadyAdded && <i className="bi bi-plus"></i>}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </Form.Group>

            {/* Tags Outros */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Tags Outros', '其他标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {factoryTags.outros.map(tag => (
                  <Badge 
                    key={tag.id} 
                    bg="danger" 
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
                  value={factoryNewTagInputs.outros}
                  onChange={(e) => setFactoryNewTagInputs(prev => ({ ...prev, outros: e.target.value }))}
                />
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={() => addNewTagToFactory('outros')}
                  disabled={!factoryNewTagInputs.outros.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Outros */}
              {globalTags && globalTags.outros && globalTags.outros.length > 0 && (
                <div className="mt-2">
                  <small className="text-muted d-block mb-2">{t('Tags Globais Disponíveis', '可用全局标签')}:</small>
                  <div className="d-flex flex-wrap gap-1">
                    {globalTags.outros.map(tag => {
                      const isAlreadyAdded = factoryTags.outros.some(t => t.id === tag.id);
                      return (
                        <Badge 
                          key={tag.id} 
                          bg="secondary" 
                          className="d-flex align-items-center gap-1"
                          style={{ 
                            cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                            opacity: isAlreadyAdded ? 0.5 : 1,
                            fontSize: '14px'
                          }}
                          onClick={() => !isAlreadyAdded && addGlobalTagToFactory(tag, 'outros')}
                          title={isAlreadyAdded ? t('Já adicionada', '已添加') : t('Clique para adicionar', '点击添加')}
                        >
                          {tag.name}
                          {!isAlreadyAdded && <i className="bi bi-plus"></i>}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </Form.Group>

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
                defaultValue={factory?.imageUrl1 || ''}
                key={`imageUrl1-${factory?.id || 'new'}`}
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
                defaultValue={factory?.imageUrl2 || ''}
                key={`imageUrl2-${factory?.id || 'new'}`}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleFactoryModalClose}>
              {t('Cancelar', '取消')}
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteFactory}
              className="me-auto"
            >
              <i className="bi bi-trash me-1"></i>
              {t('Excluir Fábrica', '删除工厂')}
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={factorySubmitting || uploadingImages.image1 || uploadingImages.image2}
            >
              {factorySubmitting ? (
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
                t('Atualizar', '更新')
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

export default FactoryDetail;
