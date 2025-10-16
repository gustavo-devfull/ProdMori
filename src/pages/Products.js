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
import productServiceAPI from '../services/productServiceAPI';
import factoryServiceAPI from '../services/factoryServiceAPI';
import imageService from '../services/imageService';
import { useLanguage } from '../contexts/LanguageContext';

const Products = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchTerm, setSearchTerm] = useState('');

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
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [loadData]);

  const handleImageUpload = async (file) => {
    try {
      const imageUrl = await imageService.uploadFile(file);
      return imageUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  };

  const handlePreview = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const formData = new FormData(e.target);
      const values = Object.fromEntries(formData.entries());
      
      const productData = {
        ...values,
        factoryId: values.factoryId
      };

      if (editingProduct) {
        await productServiceAPI.updateProduct(editingProduct.id, productData);
      } else {
        await productServiceAPI.createProduct(productData);
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

  const handleDelete = async (productId) => {
    if (!window.confirm(t('Tem certeza que deseja excluir este produto?', '确定要删除这个产品吗？'))) {
      return;
    }

    try {
      await productServiceAPI.deleteProduct(productId);
      await loadData();
    } catch (err) {
      setError(t('Erro ao excluir produto', '删除产品时出错'));
      console.error(err);
    }
  };

  // Filtrar produtos
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.segment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.factory?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFactory = !selectedFactory || product.factory?.id === selectedFactory;
    const matchesSegment = !selectedSegment || product.segment === selectedSegment;
    
    return matchesSearch && matchesFactory && matchesSegment;
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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{t('Produtos', '产品')}</h2>
        <Button 
          variant="primary" 
          onClick={() => setModalVisible(true)}
          className="d-flex align-items-center"
        >
          <i className="bi bi-plus-circle me-2"></i>
          {t('Novo Produto', '新产品')}
        </Button>
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
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('Buscar', '搜索')}</Form.Label>
                <Form.Control
                  type="text"
                  placeholder={t('Nome, segmento ou fábrica...', '名称、行业或工厂...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('Fábrica', '工厂')}</Form.Label>
                <Form.Select
                  value={selectedFactory || ''}
                  onChange={(e) => setSelectedFactory(e.target.value || null)}
                >
                  <option value="">{t('Todas as fábricas', '所有工厂')}</option>
                  {factories.map(factory => (
                    <option key={factory.id} value={factory.id}>
                      {factory.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>{t('Segmento', '行业')}</Form.Label>
                <Form.Select
                  value={selectedSegment || ''}
                  onChange={(e) => setSelectedSegment(e.target.value || null)}
                >
                  <option value="">{t('Todos os segmentos', '所有行业')}</option>
                  {[...new Set(products.map(p => p.segment).filter(Boolean))].map(segment => (
                    <option key={segment} value={segment}>
                      {segment}
                    </option>
                  ))}
                </Form.Select>
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
                        {/* Imagem do produto */}
                        <div className="text-center mb-3">
                          {product.imageUrl ? (
                            <CustomImage
                              src={product.imageUrl}
                              alt={product.name}
                              className="img-fluid rounded"
                              style={{ 
                                height: '150px', 
                                width: '100%', 
                                objectFit: 'cover' 
                              }}
                              showPreview={true}
                              onPreview={handlePreview}
                            />
                          ) : (
                            <div 
                              className="bg-light rounded d-flex align-items-center justify-content-center"
                              style={{ height: '150px' }}
                            >
                              <i className="bi bi-image text-muted fs-1"></i>
                            </div>
                          )}
                        </div>

                        {/* Informações do produto */}
                        <div className="flex-grow-1">
                          {/* Nome do produto (alinhado à esquerda) | Símbolo do yuan + U.PRICE (alinhado à direita) */}
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="card-title text-truncate mb-0" title={product.name} style={{ flex: 1, marginRight: '10px' }}>
                              {product.name || t('Sem nome', '无名称')}
                            </h6>
                            <div className="text-primary fw-bold d-flex align-items-center">
                              <span className="me-1">¥</span>
                              {product.uPrice || t('Sob consulta', '咨询价格')}
                            </div>
                          </div>
                          
                          <p className="text-muted small mb-2">
                            {product.segment || t('Sem segmento', '无行业')}
                          </p>
                        </div>
                        
                        <div className="mt-auto">
                          <Button 
                            variant="success" 
                            className="w-100"
                            size={isMobile ? 'lg' : 'md'}
                            style={{ fontSize: '14px' }}
                            onClick={() => handleEdit(product)}
                          >
                            {t('Ver Detalhes', '查看详情')}
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
                      const imageUrl = await handleImageUpload(file);
                      e.target.form.imageUrl.value = imageUrl;
                    } catch (err) {
                      console.error('Erro no upload:', err);
                    }
                  }
                }}
              />
              {editingProduct?.imageUrl && (
                <div className="mt-2">
                  <CustomImage
                    src={editingProduct.imageUrl}
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
                defaultValue={editingProduct?.imageUrl || ''}
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

            {/* REMARK */}
            <Form.Group className="mb-3">
              <Form.Label>{t('REMARK', '备注')}</Form.Label>
              <Form.Control
                type="text"
                name="remark"
                defaultValue={editingProduct?.remark || ''}
                placeholder={t('Digite observações', '输入备注')}
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
                onClick={() => handleDelete(editingProduct.id)}
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