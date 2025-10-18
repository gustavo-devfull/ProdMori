import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Row,
  Col,
  Alert,
  Spinner
} from 'react-bootstrap';
import CustomImage from '../components/CustomImage';
import AudioRecorder from '../components/AudioRecorder';
import productServiceAPI from '../services/productServiceAPI';
import factoryServiceAPI from '../services/factoryServiceAPI';
import imageService from '../services/imageService';
import { useLanguage } from '../contexts/LanguageContext';

const Products = () => {
  const { t } = useLanguage();
  
  // Detectar se é mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  const [products, setProducts] = useState([]);
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Função para limpeza agressiva de cache e refresh forçado no mobile
  const forceRefreshIfMobile = () => {
    if (isMobile) {
      console.log('📱 Mobile detectado - Forçando refresh completo da página');
      
      // Limpeza agressiva de cache
      try {
        localStorage.clear();
        sessionStorage.clear();
        console.log('📱 Cache completamente limpo no mobile');
      } catch (e) {
        console.warn('Erro ao limpar cache:', e);
      }
      
      // Refresh forçado da página
      setTimeout(() => {
        window.location.reload(true);
      }, 500);
      
      return true; // Indica que foi feito refresh
    }
    return false; // Não é mobile, não fez refresh
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [productsData, factoriesData] = await Promise.all([
        productServiceAPI.getAllProducts(),
        factoryServiceAPI.getAllFactories()
      ]);
      
      setProducts(productsData);
      setFactories(factoriesData);
      setError(null);
    } catch (err) {
      setError(t('Erro ao carregar dados', '加载数据时出错'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true);
      const uploadedImageUrl = await imageService.uploadFile(file);
      setImageUrl(uploadedImageUrl);
      return uploadedImageUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      setError(t('Erro no upload da imagem', '图片上传时出错'));
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePreview = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  const handleProductSelect = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(product => product.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      alert(t('Nenhum produto selecionado', '没有选择产品'));
      return;
    }

    const confirmMessage = t(
      `Tem certeza que deseja excluir ${selectedProducts.length} produto(s)?`,
      `确定要删除 ${selectedProducts.length} 个产品吗？`
    );

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setSubmitting(true);
    try {
      await Promise.all(
        selectedProducts.map(productId => 
          productServiceAPI.deleteProduct(productId)
        )
      );
      
      // Verificar se é mobile e forçar refresh
      if (forceRefreshIfMobile()) {
        return; // Refresh foi feito, não precisa continuar
      }
      
      await loadData();
      setSelectedProducts([]);
      setBulkDeleteMode(false);
      setError(null);
    } catch (err) {
      setError(t('Erro ao excluir produtos', '删除产品时出错'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleBulkDeleteMode = () => {
    if (!bulkDeleteMode) {
      // Entrando no modo de seleção - selecionar todos os produtos filtrados
      setBulkDeleteMode(true);
      setSelectedProducts(filteredProducts.map(product => product.id));
    } else {
      // Saindo do modo de seleção - limpar seleção
      setBulkDeleteMode(false);
      setSelectedProducts([]);
    }
  };


  const handleModalClose = () => {
    setModalVisible(false);
    setEditingProduct(null);
    setError(null);
    setCurrentAudioUrl('');
    setImageUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const formData = new FormData(e.target);
      const values = Object.fromEntries(formData.entries());
      
      const productData = {
        ...values,
        factoryId: values.factoryId,
        audioUrl: currentAudioUrl || values.audioUrl // Incluir áudio atual
      };
      
      console.log('=== HANDLE SUBMIT PRODUCTS ===');
      console.log('Current audioUrl:', currentAudioUrl);
      console.log('Values audioUrl:', values.audioUrl);
      console.log('Final audioUrl:', productData.audioUrl);
      console.log('Product data:', productData);

      if (editingProduct) {
        await productServiceAPI.updateProduct(editingProduct.id, productData);
      } else {
        await productServiceAPI.createProduct(productData);
      }
      
      // Verificar se é mobile e forçar refresh
      if (forceRefreshIfMobile()) {
        return; // Refresh foi feito, não precisa continuar
      }
      
      await loadData();
      handleModalClose();
    } catch (err) {
      setError(t('Erro ao salvar produto', '保存产品时出错'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = (product) => {
    console.log('Editando produto:', product);
    setEditingProduct(product);
    setImageUrl(product.imageUrl || '');
    setCurrentAudioUrl(product.audioUrls?.[0]?.url || product.audioUrl || '');
    setModalVisible(true);
  };

  const handleDelete = async (productId) => {
    console.log('Products.handleDelete - Tentando excluir produto:', productId);
    
    if (!window.confirm(t('Tem certeza que deseja excluir este produto?', '确定要删除这个产品吗？'))) {
      console.log('Products.handleDelete - Exclusão cancelada pelo usuário');
      return;
    }

    try {
      setSubmitting(true);
      console.log('Products.handleDelete - Chamando productServiceAPI.deleteProduct');
      await productServiceAPI.deleteProduct(productId);
      console.log('Products.handleDelete - Produto excluído com sucesso');
      
      // Verificar se é mobile e forçar refresh
      if (forceRefreshIfMobile()) {
        return; // Refresh foi feito, não precisa continuar
      }
      
      console.log('Products.handleDelete - Recarregando dados');
      await loadData();
      console.log('Products.handleDelete - Dados recarregados');
      
      // Fechar modal se estiver aberto
      if (modalVisible) {
        handleModalClose();
      }
    } catch (err) {
      console.error('Products.handleDelete - Erro ao excluir produto:', err);
      setError(t('Erro ao excluir produto', '删除产品时出错'));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Buscar no REF
    const matchesRef = product.ref?.toLowerCase().includes(searchLower);
    
    // Buscar no REMARK
    const matchesRemark = product.remark?.toLowerCase().includes(searchLower);
    
    // Buscar no nome da fábrica
    const matchesFactoryName = product.factory?.name?.toLowerCase().includes(searchLower);
    
    // Buscar no U.PRICE
    const matchesUPrice = product.uPrice?.toString().toLowerCase().includes(searchLower);
    
    return matchesRef || matchesRemark || matchesFactoryName || matchesUPrice;
  }).sort((a, b) => {
    // Ordenar por data de criação (mais recentes primeiro)
    if (a.createdAt && b.createdAt) {
      const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    }
    return 0;
  });

  // Agrupar produtos por fábrica
  const groupedProducts = filteredProducts.reduce((acc, product) => {
    const factoryName = product.factory?.name || t('Sem fábrica', '无工厂');
    if (!acc[factoryName]) {
      acc[factoryName] = [];
    }
    acc[factoryName].push(product);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="mb-0">{t('Produtos', '产品')}</h2>
          <div className="d-flex gap-2">
            {bulkDeleteMode && (
              <>
                <Button 
                  variant="outline-secondary" 
                  onClick={handleSelectAll}
                  className="d-flex align-items-center"
                >
                  <i className="bi bi-check-square me-1"></i>
                  {selectedProducts.length === filteredProducts.length 
                    ? t('Desmarcar Todos', '取消全选') 
                    : t('Selecionar Todos', '全选')
                  }
                </Button>
                <Button 
                  variant="danger" 
                  onClick={handleBulkDelete}
                  disabled={selectedProducts.length === 0 || submitting}
                  className="d-flex align-items-center"
                >
                  {submitting ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {t('Excluindo...', '删除中...')}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-trash me-1"></i>
                      {t('Excluir Selecionados', '删除选中')} ({selectedProducts.length})
                    </>
                  )}
                </Button>
              </>
            )}
            <Button 
              variant={bulkDeleteMode ? "secondary" : "outline-danger"} 
              onClick={toggleBulkDeleteMode}
              className="d-flex align-items-center"
              title={bulkDeleteMode ? t('Cancelar Seleção', '取消选择') : t('Selecionar Produtos', '选择产品')}
            >
              <i className={`bi ${bulkDeleteMode ? 'bi-x-circle' : 'bi-check-square'}`}></i>
            </Button>
            <Button 
              variant="primary" 
              onClick={() => setModalVisible(true)}
              className="d-flex align-items-center"
              title={t('Novo Produto', '新产品')}
            >
              <i className="bi bi-plus-circle"></i>
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={12}>
              <Form.Group>
                <Form.Label>{t('Buscar', '搜索')}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t('REF, REMARK, Nome da fábrica ou U.PRICE...', '参考号、备注、工厂名称或单价...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Lista de produtos */}
      {Object.keys(groupedProducts).length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="bi bi-box text-muted fs-1"></i>
            <h5 className="mt-3 text-muted">{t('Nenhum produto encontrado', '未找到产品')}</h5>
            <p className="text-muted">{t('Tente ajustar os filtros ou cadastre um novo produto', '尝试调整过滤器或注册新产品')}</p>
          </Card.Body>
        </Card>
      ) : (
        <div>
          {Object.entries(groupedProducts).map(([factoryName, factoryProducts]) => (
            <div key={factoryName} className="mb-4">
              {/* Card com nome da fábrica - fundo azul e letra branca */}
              <Card className="mb-3" style={{ backgroundColor: '#0d6efd', color: 'white' }}>
                <Card.Body className="py-2">
                  <h5 className="mb-0 text-center">{factoryName}</h5>
                </Card.Body>
              </Card>
              
              <Row className="g-3">
                {factoryProducts.map(product => (
                  <Col
                    key={product.id}
                    xs={12}
                    sm={6}
                    md={4}
                    lg={3}
                  >
                    <Card className="h-100 shadow-sm">
                      <Card.Body className="d-flex flex-column">
                        {/* Checkbox de seleção - acima da imagem */}
                        {bulkDeleteMode && (
                          <div className="mb-2 d-flex justify-content-center">
                            <Form.Check
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => handleProductSelect(product.id)}
                              className="bg-white rounded shadow-sm p-2"
                            />
                          </div>
                        )}
                        
                        {/* Imagem do produto - 100% largura e 200px altura */}
                        <div className="mb-3">
                          {product.imageUrl ? (
                            <CustomImage
                              src={product.imageUrl}
                              alt={product.name}
                              className="img-fluid rounded"
                              style={{ 
                                height: '200px', 
                                width: '100%', 
                                objectFit: 'cover' 
                              }}
                              showPreview={true}
                              onPreview={handlePreview}
                            />
                          ) : (
                            <div 
                              className="bg-light rounded d-flex align-items-center justify-content-center"
                              style={{ height: '200px', width: '100%' }}
                            >
                              <i className="bi bi-image text-muted fs-1"></i>
                            </div>
                          )}
                        </div>

                        {/* REF | U.PRICE */}
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <span className="fw-medium">
                            {product.ref || t('Sem REF', '无REF')}
                          </span>
                          <span className="text-primary fw-bold">
                            ¥ {product.uPrice || t('Sob consulta', '咨询价格')}
                          </span>
                        </div>
                        
                        {/* Card de Áudio */}
                        <div className="mb-3">
                          <AudioRecorder 
                            onAudioReady={(blob, url) => {
                              console.log('Áudio gravado:', blob, url);
                            }}
                            productId={product.id}
                            initialAudioUrl={product.audioUrls?.[0]?.url || product.audioUrl}
                            collapsed={true}
                            disabled={false}
                          />
                        </div>

                        {/* Botões EDITAR | EXCLUIR */}
                        <div className="d-flex gap-2 mt-auto">
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            className="flex-fill"
                            onClick={() => handleEditProduct(product)}
                          >
                            <i className="bi bi-pencil me-1"></i>
                            {t('EDITAR', '编辑')}
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            className="flex-fill"
                            onClick={() => handleDelete(product.id)}
                          >
                            <i className="bi bi-trash me-1"></i>
                            {t('EXCLUIR', '删除')}
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </div>
      )}

      {/* Modal para cadastrar/editar produto */}
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
                disabled={submitting}
                className="d-flex align-items-center"
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('Salvando...', '保存中...')}
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1"></i>
                    {t('Salvar', '保存')}
                  </>
                )}
              </Button>
            </div>

            {/* Seleção da Fábrica */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Fábrica', '工厂')}</Form.Label>
              <Form.Select
                name="factoryId"
                defaultValue={editingProduct?.factoryId || ''}
                required
              >
                <option value="">{t('Selecione uma fábrica', '选择工厂')}</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </Form.Select>
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
                      await handleImageUpload(file);
                    } catch (err) {
                      console.error('Erro no upload:', err);
                    }
                  }
                }}
                disabled={uploadingImage}
              />
              {uploadingImage && (
                <div className="mt-2 text-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Enviando imagem...', '上传图片中...')}
                </div>
              )}
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

            {/* UNIT/CTN | CBM */}
            <Row className="mb-3">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>{t('UNIT/CTN', '单位/箱')}</Form.Label>
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

            {/* Peso unitário (g) */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Peso unitário (g)', '单位重量(克)')}</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                name="unitWeight"
                defaultValue={editingProduct?.unitWeight || ''}
                placeholder={t('Peso em gramas', '重量(克)')}
              />
            </Form.Group>

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

            {/* REMARK */}
            <Form.Group className="mb-3">
              <Form.Label>{t('REMARK', '备注')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="remark"
                defaultValue={editingProduct?.remark || ''}
                placeholder={t('Digite observações adicionais', '输入额外备注')}
              />
            </Form.Group>

            {/* Gravação de Áudio */}
            <Form.Group className="mb-3">
              <AudioRecorder 
                onAudioReady={(blob, url) => {
                  console.log('Áudio gravado:', blob, url);
                }}
                onAudioChange={(url) => {
                  console.log('AudioRecorder onAudioChange chamado com URL:', url);
                  setCurrentAudioUrl(url);
                }}
                productId={editingProduct?.id || 'new'}
                initialAudioUrl={editingProduct?.audioUrls?.[0]?.url || editingProduct?.audioUrl}
                disabled={submitting}
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
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(editingProduct.id);
                }}
                disabled={submitting}
                style={{ marginRight: 'auto' }}
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('Excluindo...', '删除中...')}
                  </>
                ) : (
                  t('Excluir Produto', '删除产品')
                )}
              </Button>
            )}
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Salvando...', '保存中...')}
                </>
              ) : (
                editingProduct ? t('Atualizar', '更新') : t('Criar', '创建')
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

export default Products;