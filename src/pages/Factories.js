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
  ListGroup,
  Badge
} from 'react-bootstrap';
import factoryServiceAPI from '../services/factoryServiceAPI';
import imageService from '../services/imageService';
import tagService from '../services/tagService';
import CustomImage from '../components/CustomImage';
import { useLanguage } from '../contexts/LanguageContext';

const Factories = () => {
  const { t } = useLanguage();
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFactory, setEditingFactory] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [previewVisible, setPreviewVisible] = useState(false);
  const [factoryTagsMap, setFactoryTagsMap] = useState({});
  const [previewImage, setPreviewImage] = useState('');
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
  const [globalTags, setGlobalTags] = useState({
    regiao: [],
    material: [],
    outros: []
  });
  const [selectedTags, setSelectedTags] = useState([]);
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);

  const loadFactories = useCallback(async (showRefresh = false) => {
    try {
      setLoading(true);
      if (showRefresh) setRefreshing(true);
      
      const data = await factoryServiceAPI.getAllFactories();
      
      // Carregar produtos para cada fábrica
      const factoriesWithProducts = await Promise.all(
        data.map(async (factory) => {
          try {
            const products = await factoryServiceAPI.getProductsByFactory(factory.id);
            return { ...factory, products };
          } catch (error) {
            console.error(`Erro ao carregar produtos da fábrica ${factory.id}:`, error);
            return { ...factory, products: [] };
          }
        })
      );
      
      setFactories(factoriesWithProducts);
      setError(null);
      
      // Debug: verificar tags no localStorage
      console.log('=== DEBUG TAGS ===');
      factoriesWithProducts.forEach(factory => {
        const savedTags = localStorage.getItem(`tags_${factory.id}`);
        console.log(`Factory ${factory.name} (${factory.id}):`, savedTags);
      });
      console.log('=== FIM DEBUG TAGS ===');
    } catch (err) {
      setError(t('Erro ao carregar fábricas', '加载工厂时出错'));
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadFactories();
  }, [loadFactories]);

  // Carregar tags das fábricas quando as fábricas forem carregadas
  useEffect(() => {
    if (factories.length > 0) {
      factories.forEach(factory => {
        loadFactoryTags(factory.id);
      });
    }
  }, [factories]);

  // Carregar tags globais
  useEffect(() => {
    const loadGlobalTags = async () => {
      try {
        const globalTagsData = await tagService.getAllTags();
        setGlobalTags(globalTagsData);
      } catch (error) {
        console.error('Erro ao carregar tags globais:', error);
        // Fallback para localStorage
        try {
          const savedTags = localStorage.getItem('globalTags');
          if (savedTags) {
            const parsedTags = JSON.parse(savedTags);
            const safeTags = {
              regiao: Array.isArray(parsedTags?.regiao) ? parsedTags.regiao : [],
              material: Array.isArray(parsedTags?.material) ? parsedTags.material : [],
              outros: Array.isArray(parsedTags?.outros) ? parsedTags.outros : []
            };
            setGlobalTags(safeTags);
          } else {
            setGlobalTags({ regiao: [], material: [], outros: [] });
          }
        } catch (fallbackError) {
          console.error('Erro no fallback localStorage:', fallbackError);
          setGlobalTags({ regiao: [], material: [], outros: [] });
        }
      }
    };
    
    loadGlobalTags();
  }, []);

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      // Verificar se há uploads em andamento
      if (uploadingImages.image1 || uploadingImages.image2) {
        console.log('Aguardando upload das imagens...');
        setError(t('Aguarde o upload das imagens terminar', '等待图片上传完成'));
        setSubmitting(false); // Resetar estado de submitting
        return;
      }
      
      // Usar as URLs das imagens do estado do React
      const finalValues = {
        ...values,
        imageUrl1: imageUrls.image1 || values.imageUrl1,
        imageUrl2: imageUrls.image2 || values.imageUrl2
      };
      
      // Debug: verificar se as URLs das imagens estão sendo enviadas
      console.log('Dados do formulário:', finalValues);
      console.log('imageUrl1:', finalValues.imageUrl1);
      console.log('imageUrl2:', finalValues.imageUrl2);
      
      // Verificar se ambas as imagens estão presentes
      if (!finalValues.imageUrl1 && !finalValues.imageUrl2) {
        console.warn('Nenhuma imagem foi enviada');
      } else if (!finalValues.imageUrl1) {
        console.warn('Imagem principal (imageUrl1) não foi enviada');
      } else if (!finalValues.imageUrl2) {
        console.warn('Imagem secundária (imageUrl2) não foi enviada');
      }
      
      if (editingFactory) {
        await factoryServiceAPI.updateFactory(editingFactory.id, finalValues);
        // Salvar as tags da fábrica usando o serviço
        Object.keys(factoryTags).forEach(division => {
          factoryTags[division].forEach(tag => {
            tagService.addTagToFactory(editingFactory.id, tag);
          });
        });
        
        // Sincronizar tags globais após salvar
        tagService.syncGlobalTags();
      } else {
        const newFactory = await factoryServiceAPI.createFactory(finalValues);
        // Salvar as tags da fábrica usando o serviço
        if (newFactory && newFactory.id) {
          Object.keys(factoryTags).forEach(division => {
            factoryTags[division].forEach(tag => {
              tagService.addTagToFactory(newFactory.id, tag);
            });
          });
          
          // Sincronizar tags globais após salvar
          tagService.syncGlobalTags();
        }
      }
      
      setModalVisible(false);
      setEditingFactory(null);
      await loadFactories();
    } catch (err) {
      setError(t('Erro ao salvar fábrica', '保存工厂时出错'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await factoryServiceAPI.deleteFactory(id);
      await loadFactories();
    } catch (err) {
      setError(t('Erro ao excluir fábrica', '删除工厂时出错'));
      console.error(err);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingFactory(null);
    setError(null);
    // Limpar estado das imagens
    setImageUrls({ image1: '', image2: '' });
    setUploadingImages({ image1: false, image2: false });
    resetFactoryTags();
    setShowAdditionalFields(false);
  };

  const handleNewFactory = async () => {
    setEditingFactory(null);
    setModalVisible(true);
    // Limpar tags da fábrica para nova fábrica
    resetFactoryTags();
    
    // Recarregar tags globais
    try {
      console.log('Carregando tags globais para nova fábrica...');
      const globalTagsData = await tagService.getAllTags();
      console.log('Tags globais carregadas:', globalTagsData);
      setGlobalTags(globalTagsData);
    } catch (error) {
      console.error('Erro ao carregar tags globais:', error);
      // Fallback para localStorage
      try {
        const savedTags = localStorage.getItem('globalTags');
        if (savedTags) {
          const parsedTags = JSON.parse(savedTags);
          const safeTags = {
            regiao: Array.isArray(parsedTags?.regiao) ? parsedTags.regiao : [],
            material: Array.isArray(parsedTags?.material) ? parsedTags.material : [],
            outros: Array.isArray(parsedTags?.outros) ? parsedTags.outros : []
          };
          setGlobalTags(safeTags);
        } else {
          setGlobalTags({ regiao: [], material: [], outros: [] });
        }
      } catch (fallbackError) {
        console.error('Erro no fallback localStorage:', fallbackError);
        setGlobalTags({ regiao: [], material: [], outros: [] });
      }
    }
  };

  const handleEditFactory = async (factory) => {
    setEditingFactory(factory);
    setModalVisible(true);
    
    // Carregar tags da fábrica existente
    try {
      const factoryTagsData = await tagService.getFactoryTags(factory.id);
      console.log('handleEditFactory - Tags carregadas:', factoryTagsData);
      
      // Garantir que a estrutura está correta
      const safeTags = {
        regiao: Array.isArray(factoryTagsData?.regiao) ? factoryTagsData.regiao : [],
        material: Array.isArray(factoryTagsData?.material) ? factoryTagsData.material : [],
        outros: Array.isArray(factoryTagsData?.outros) ? factoryTagsData.outros : []
      };
      
      setFactoryTags(safeTags);
      console.log('handleEditFactory - Tags definidas no estado:', safeTags);
    } catch (error) {
      console.error('Erro ao carregar tags da fábrica:', error);
      resetFactoryTags();
    }
    
    // Recarregar tags globais
    try {
      const globalTagsData = await tagService.getAllTags();
      setGlobalTags(globalTagsData);
    } catch (error) {
      console.error('Erro ao carregar tags globais:', error);
      // Fallback para localStorage
      try {
        const savedTags = localStorage.getItem('globalTags');
        if (savedTags) {
          const parsedTags = JSON.parse(savedTags);
          const safeTags = {
            regiao: Array.isArray(parsedTags?.regiao) ? parsedTags.regiao : [],
            material: Array.isArray(parsedTags?.material) ? parsedTags.material : [],
            outros: Array.isArray(parsedTags?.outros) ? parsedTags.outros : []
          };
          setGlobalTags(safeTags);
        } else {
          setGlobalTags({ regiao: [], material: [], outros: [] });
        }
      } catch (fallbackError) {
        console.error('Erro no fallback localStorage:', fallbackError);
        setGlobalTags({ regiao: [], material: [], outros: [] });
      }
    }
  };

  // Funções para gerenciar tags
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
    const tagName = newTagInputs[division].trim();
    if (!tagName) return;

    const newTag = {
      id: Date.now().toString(),
      name: tagName,
      division: division,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Adicionar ao serviço global de tags (usando Firebase se disponível)
    const result = await tagService.addTag(newTag, editingFactory?.id);
    if (result.success) {
      console.log('Tag adicionada com sucesso:', result);
      // Adicionar à fábrica atual
      addTagToFactory(newTag, division);
      
      // Atualizar tags globais disponíveis
      try {
        const globalTagsData = await tagService.getAllTags();
        setGlobalTags(globalTagsData);
      } catch (error) {
        console.error('Erro ao carregar tags globais:', error);
        // Fallback para localStorage
        try {
          const savedTags = localStorage.getItem('globalTags');
          if (savedTags) {
            const parsedTags = JSON.parse(savedTags);
            const safeTags = {
              regiao: Array.isArray(parsedTags?.regiao) ? parsedTags.regiao : [],
              material: Array.isArray(parsedTags?.material) ? parsedTags.material : [],
              outros: Array.isArray(parsedTags?.outros) ? parsedTags.outros : []
            };
            setGlobalTags(safeTags);
          }
        } catch (fallbackError) {
          console.error('Erro no fallback localStorage:', fallbackError);
        }
      }
    } else {
      console.warn('Tag já existe globalmente:', result.message);
      // Mesmo assim, adicionar à fábrica atual
      addTagToFactory(newTag, division);
    }

    // Limpar input
    setNewTagInputs(prev => ({
      ...prev,
      [division]: ''
    }));
  };

  const addGlobalTagToFactory = (tag, division) => {
    console.log('=== ADD GLOBAL TAG TO FACTORY (Factories page) ===');
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
    setNewTagInputs({
      regiao: '',
      material: '',
      outros: ''
    });
  };

  // Função para carregar tags de uma fábrica
  const loadFactoryTags = async (factoryId) => {
    try {
      console.log('loadFactoryTags - Factory ID:', factoryId);
      
      // Tentar carregar tags do Firebase primeiro
      let factoryTags;
      try {
        factoryTags = await tagService.getFactoryTags(factoryId);
        console.log('loadFactoryTags - Tags carregadas do Firebase:', factoryTags);
      } catch (firebaseError) {
        console.warn('Erro ao carregar do Firebase, usando localStorage:', firebaseError);
        // Fallback para localStorage
        const savedTags = localStorage.getItem(`tags_${factoryId}`);
        console.log('loadFactoryTags - Saved tags (localStorage):', savedTags);
        
        if (!savedTags) {
          console.log('loadFactoryTags - No saved tags found');
          return;
        }
        
        factoryTags = JSON.parse(savedTags);
      }
      
      console.log('loadFactoryTags - Parsed tags:', factoryTags);
      
      // Verificar se factoryTags é válido
      if (!factoryTags || typeof factoryTags !== 'object') {
        console.log('loadFactoryTags - Invalid factoryTags, skipping');
        return;
      }
      
      const allFactoryTags = [];
      
      // Combinar todas as tags da fábrica
      if (factoryTags.regiao && Array.isArray(factoryTags.regiao) && factoryTags.regiao.length > 0) {
        allFactoryTags.push(...factoryTags.regiao.map(tag => ({ ...tag, type: 'regiao' })));
      }
      
      if (factoryTags.material && Array.isArray(factoryTags.material) && factoryTags.material.length > 0) {
        allFactoryTags.push(...factoryTags.material.map(tag => ({ ...tag, type: 'material' })));
      }
      
      if (factoryTags.outros && Array.isArray(factoryTags.outros) && factoryTags.outros.length > 0) {
        allFactoryTags.push(...factoryTags.outros.map(tag => ({ ...tag, type: 'outros' })));
      }
      
      console.log('loadFactoryTags - All factory tags:', allFactoryTags);
      
      // Atualizar o estado com as tags da fábrica (manter estrutura com divisões)
      setFactoryTagsMap(prev => ({
        ...prev,
        [factoryId]: {
          regiao: factoryTags.regiao || [],
          material: factoryTags.material || [],
          outros: factoryTags.outros || []
        }
      }));
      
    } catch (error) {
      console.error('Erro ao carregar tags da fábrica:', error);
    }
  };

  // Função para renderizar tags da fábrica
  const renderFactoryTags = (factory) => {
    const factoryTags = factoryTagsMap[factory.id] || { regiao: [], material: [], outros: [] };
    
    // Combinar todas as tags em um array para renderização
    const allTags = [
      ...(factoryTags.regiao || []),
      ...(factoryTags.material || []),
      ...(factoryTags.outros || [])
    ];
    
    if (!allTags || allTags.length === 0) {
      return null;
    }
    
    return (
      <div className="mt-3" style={{ minHeight: '30px' }}>
        <div className="d-flex flex-wrap gap-1" style={{ width: '100%' }}>
          {allTags.map(tag => (
            <Badge 
              key={tag.id} 
              bg={tag.type === 'regiao' ? 'primary' : tag.type === 'material' ? 'success' : 'danger'}
              className="d-flex align-items-center gap-1"
              style={{ 
                fontSize: '14px',
                minHeight: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                whiteSpace: 'nowrap'
              }}
            >
              <i className={`bi ${tag.type === 'regiao' ? 'bi-geo-alt' : tag.type === 'material' ? 'bi-box' : 'bi-tag'}`}></i>
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const toggleProductsExpansion = (factoryId) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(factoryId)) {
      newExpanded.delete(factoryId);
    } else {
      newExpanded.add(factoryId);
    }
    setExpandedProducts(newExpanded);
  };

  const handlePreview = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };





  if (loading && !refreshing) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-primary text-white p-3 rounded mb-3">
        <div className="d-flex justify-content-between align-items-center">
          <h2 className="mb-0 fs-5 fw-semibold">{t('Fábricas/Lojas', '工厂/商店')}</h2>
          <div className="d-flex gap-2">
            <Button 
              variant="light"
              size="sm"
              onClick={handleNewFactory}
              className="d-flex align-items-center"
            >
              <i className="bi bi-plus-circle me-1"></i>
              {t('Nova', '新建')}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="d-flex justify-content-end mb-3">
        <Button 
          variant="outline-primary"
          size="sm"
          onClick={() => window.location.reload()}
          className="d-flex align-items-center"
        >
          <i className="bi bi-arrow-clockwise me-1"></i>
          {t('Atualizar', '刷新')}
        </Button>
      </div>

      {/* Filtro de Tags */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={12}>
              <Form.Group>
                <Form.Label>{t('Filtrar por Tags', '按标签筛选')}</Form.Label>
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {[...new Set(Object.values(globalTags).flat().map(tag => tag.name))].map(tagName => (
                    <Badge
                      key={tagName}
                      bg={selectedTags.includes(tagName) ? "primary" : "secondary"}
                      style={{ cursor: 'pointer', fontSize: '14px' }}
                      onClick={() => {
                        if (selectedTags.includes(tagName)) {
                          setSelectedTags(selectedTags.filter(t => t !== tagName));
                        } else {
                          setSelectedTags([...selectedTags, tagName]);
                        }
                      }}
                    >
                      {tagName}
                      {selectedTags.includes(tagName) && (
                        <i className="bi bi-x ms-1"></i>
                      )}
                    </Badge>
                  ))}
                  {selectedTags.length > 0 && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setSelectedTags([])}
                      className="ms-2"
                    >
                      {t('Limpar', '清除')}
                    </Button>
                  )}
                </div>
                {selectedTags.length > 0 && (
                  <small className="text-muted d-block mt-1">
                    {t('Tags selecionadas', '已选标签')}: {selectedTags.join(', ')}
                  </small>
                )}
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {factories.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="bi bi-shop text-muted fs-1"></i>
            <h5 className="mt-3 text-muted">{t('Nenhuma fábrica cadastrada', '没有注册的工厂')}</h5>
            <p className="text-muted">{t('Clique em "Nova Fábrica/Loja" para começar', '点击"新建工厂/商店"开始')}</p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {factories.filter(factory => {
            // Se não há tags selecionadas, mostrar todas as fábricas
            if (selectedTags.length === 0) return true;
            
            // Verificar se a fábrica tem alguma das tags selecionadas
            const factoryTags = factoryTagsMap[factory.id] || { regiao: [], material: [], outros: [] };
            const allFactoryTags = [...factoryTags.regiao, ...factoryTags.material, ...factoryTags.outros];
            
            return selectedTags.some(selectedTag => 
              allFactoryTags.some(factoryTag => factoryTag.name === selectedTag)
            );
          }).map(factory => (
            <Col xs={12} md={6} lg={4} key={factory.id}>
              <Card className="h-100 shadow-lg">
                <Card.Body>
                  {/* Nome da fábrica e botão de editar */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">{factory.name}</h5>
                    <Button 
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleEditFactory(factory)}
                      title={t('Editar fábrica', '编辑工厂')}
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                  </div>

                  {/* Imagens da fábrica */}
                  {(() => {
                    console.log('Factory images check:', {
                      factoryId: factory.id,
                      factoryName: factory.name,
                      imageUrl1: factory.imageUrl1,
                      imageUrl2: factory.imageUrl2,
                      hasImages: !!(factory.imageUrl1 || factory.imageUrl2)
                    });
                    return (factory.imageUrl1 || factory.imageUrl2);
                  })() && (
                    <div className="mb-3" style={{ minHeight: '120px' }}>
                      <Row className="g-2">
                        {factory.imageUrl1 && (
                          <Col xs={6}>
                            <div style={{ width: '100%', height: '120px', overflow: 'hidden', borderRadius: '8px' }}>
                              <CustomImage
                                src={factory.imageUrl1}
                                alt={`${factory.name} - Imagem 1`}
                                className="img-fluid rounded"
                                style={{ 
                                  height: '120px', 
                                  objectFit: 'cover', 
                                  width: '100%',
                                  minHeight: '120px'
                                }}
                                showPreview={true}
                                onPreview={handlePreview}
                              />
                            </div>
                          </Col>
                        )}
                        {factory.imageUrl2 && (
                          <Col xs={6}>
                            <div style={{ width: '100%', height: '120px', overflow: 'hidden', borderRadius: '8px' }}>
                              <CustomImage
                                src={factory.imageUrl2}
                                alt={`${factory.name} - Imagem 2`}
                                className="img-fluid rounded"
                                style={{ 
                                  height: '120px', 
                                  objectFit: 'cover', 
                                  width: '100%',
                                  minHeight: '120px'
                                }}
                                showPreview={true}
                                onPreview={handlePreview}
                              />
                            </div>
                          </Col>
                        )}
                      </Row>
                    </div>
                  )}

                  {/* Tags da fábrica */}
                  {renderFactoryTags(factory)}

                  {/* Lista de Produtos da fábrica */}
                  {factory.products && factory.products.length > 0 && (
                    <div className="mt-3">
                      <div 
                        className="d-flex align-items-center justify-content-between p-2 rounded bg-light cursor-pointer"
                        onClick={() => toggleProductsExpansion(factory.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="fw-medium small">
                          {t('Produtos', '产品')} ({factory.products.length})
                        </span>
                        <i 
                          className={`bi bi-chevron-down transition-transform ${
                            expandedProducts.has(factory.id) ? 'rotate-180' : ''
                          }`}
                        ></i>
                      </div>
                      
                      {expandedProducts.has(factory.id) && (
                        <div className="mt-2">
                          <ListGroup variant="flush">
                            {factory.products.map((product, index) => (
                              <ListGroup.Item key={index} className="px-0 py-1 border-0">
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="text-truncate me-2 flex-grow-1">
                                    {product.name}
                                  </span>
                                  <small className="text-muted">
                                    {product.price ? `¥ ${product.price.toFixed(2)}` : t('Sob consulta', '咨询价格')}
                                  </small>
                                </div>
                              </ListGroup.Item>
                            ))}
                          </ListGroup>
                        </div>
                      )}
                    </div>
                  )}

                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={modalVisible} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingFactory ? t('Editar Fábrica/Loja', '编辑工厂/商店') : t('Nova Fábrica/Loja', '新建工厂/商店')}
          </Modal.Title>
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
                defaultValue={editingFactory?.name || ''}
                placeholder={t('Digite o nome da fábrica/loja', '输入工厂/商店名称')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Nome do Contato', '联系人姓名')}</Form.Label>
              <Form.Control
                type="text"
                name="contactName"
                defaultValue={editingFactory?.contactName || ''}
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
                    defaultValue={editingFactory?.phone || ''}
                    placeholder={t('Digite o telefone', '输入电话号码')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('WeChat', '微信')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="wechat"
                    defaultValue={editingFactory?.wechat || ''}
                    placeholder={t('Digite o WeChat', '输入微信号')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('E-mail', '邮箱')}</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    defaultValue={editingFactory?.email || ''}
                    placeholder={t('Digite o e-mail', '输入邮箱地址')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('Localização', '位置')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="location"
                    defaultValue={editingFactory?.location || ''}
                    placeholder={t('Digite a localização', '输入位置')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('Segmento', '行业')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="segment"
                    defaultValue={editingFactory?.segment || ''}
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
                defaultValue={editingFactory?.description || ''}
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
              
              {/* Tags Globais Região */}
              <div className="mt-2">
                <small className="text-muted d-block mb-2">{t('Tags Globais Disponíveis', '可用全局标签')}:</small>
                {globalTags && globalTags.regiao && globalTags.regiao.length > 0 ? (
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
                ) : (
                  <small className="text-muted">{t('Nenhuma tag global disponível', '没有可用的全局标签')}</small>
                )}
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
              
              {/* Tags Globais Material */}
              <div className="mt-2">
                <small className="text-muted d-block mb-2">{t('Tags Globais Disponíveis', '可用全局标签')}:</small>
                {globalTags && globalTags.material && globalTags.material.length > 0 ? (
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
                ) : (
                  <small className="text-muted">{t('Nenhuma tag global disponível', '没有可用的全局标签')}</small>
                )}
              </div>
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
                  value={newTagInputs.outros}
                  onChange={(e) => setNewTagInputs(prev => ({ ...prev, outros: e.target.value }))}
                />
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => addNewTagToFactory('outros')}
                  disabled={!newTagInputs.outros.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Outros */}
              <div className="mt-2">
                <small className="text-muted d-block mb-2">{t('Tags Globais Disponíveis', '可用全局标签')}:</small>
                {globalTags && globalTags.outros && globalTags.outros.length > 0 ? (
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
                ) : (
                  <small className="text-muted">{t('Nenhuma tag global disponível', '没有可用的全局标签')}</small>
                )}
              </div>
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
                      // Armazenar URL da imagem no estado do React
                      setImageUrls(prev => ({ ...prev, image1: imageUrl }));
                      console.log('Estado imageUrl1 atualizado:', imageUrl);
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
                defaultValue={editingFactory?.imageUrl1 || ''}
                key={`imageUrl1-${editingFactory?.id || 'new'}`}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Imagem Secundária', '副图片')}</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                name="image2"
                onChange={async (e) => {
                  console.log('Evento onChange da imagem secundária disparado');
                  const file = e.target.files[0];
                  console.log('Arquivo selecionado para imagem secundária:', file);
                  if (file) {
                    try {
                      setUploadingImages(prev => ({ ...prev, image2: true }));
                      console.log('Iniciando upload da imagem secundária...');
                      const imageUrl = await imageService.uploadFile(file);
                      console.log('Imagem secundária enviada:', imageUrl);
                      // Armazenar URL da imagem no estado do React
                      setImageUrls(prev => ({ ...prev, image2: imageUrl }));
                      console.log('Estado imageUrl2 atualizado:', imageUrl);
                    } catch (error) {
                      console.error('Erro no upload da imagem secundária:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    } finally {
                      setUploadingImages(prev => ({ ...prev, image2: false }));
                    }
                  } else {
                    console.log('Nenhum arquivo selecionado para imagem secundária');
                  }
                }}
              />
              <Form.Control
                type="hidden"
                name="imageUrl2"
                defaultValue={editingFactory?.imageUrl2 || ''}
                key={`imageUrl2-${editingFactory?.id || 'new'}`}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <div className="d-flex justify-content-between w-100">
              <div>
                {editingFactory && (
                  <Button 
                    variant="danger" 
                    onClick={() => {
                      if (window.confirm(t('Tem certeza que deseja excluir esta fábrica?', '确定要删除这个工厂吗？'))) {
                        handleDelete(editingFactory.id);
                        handleModalClose();
                      }
                    }}
                    disabled={submitting}
                  >
                    <i className="bi bi-trash me-1"></i>
                    {t('Excluir', '删除')}
                  </Button>
                )}
              </div>
              <div>
                <Button variant="secondary" onClick={handleModalClose} className="me-2">
                  {t('Cancelar', '取消')}
                </Button>
                <Button 
                  variant="primary" 
                  type="submit" 
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
                    editingFactory ? t('Atualizar', '更新') : t('Criar', '创建')
                  )}
                </Button>
              </div>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

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

export default Factories;