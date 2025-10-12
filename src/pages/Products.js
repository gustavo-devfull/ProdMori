import React, { useState, useEffect } from 'react';
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
import CustomImage from '../components/CustomImage';
import productService from '../services/productService';
import factoryService from '../services/factoryService';

const Products = () => {
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

  useEffect(() => {
    loadData();
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, factoriesData] = await Promise.all([
        productService.getAllProducts(),
        factoryService.getAllFactories()
      ]);
      
      setProducts(productsData);
      setFactories(factoriesData);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      const imageUrl = await productService.uploadImage(file);
      return imageUrl;
    } catch (err) {
      setError('Erro ao fazer upload da imagem');
      console.error(err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData.entries());
    
    try {
      setSubmitting(true);
      
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, values);
      } else {
        await productService.createProduct(values);
      }
      
      setModalVisible(false);
      setEditingProduct(null);
      await loadData();
    } catch (err) {
      setError('Erro ao salvar produto');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setModalVisible(true);
  };


  const handleModalClose = () => {
    setModalVisible(false);
    setEditingProduct(null);
  };

  const handlePreview = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  const getFactoryColor = (factoryName) => {
    if (!factoryName) return '#1890ff';
    
    // Paleta de cores mais ampla e diversificada
    const colors = [
      '#1890ff', '#52c41a', '#fa541c', '#722ed1', '#eb2f96',
      '#13c2c2', '#faad14', '#f5222d', '#2f54eb', '#52c41a',
      '#fa8c16', '#a0d911', '#faad14', '#13c2c2', '#722ed1', '#eb2f96',
      '#096dd9', '#389e0d', '#d4380d', '#531dab', '#c41d7f',
      '#08979c', '#d48806', '#cf1322', '#1d39c4', '#389e0d',
      '#d46b08', '#7cb305', '#d4b106', '#08979c', '#531dab', '#c41d7f',
      '#0050b3', '#237804', '#a8071a', '#391085', '#9e1068',
      '#006d75', '#ad6800', '#a8071a', '#10239e', '#237804',
      '#ad4e00', '#5b8c00', '#ad8b00', '#006d75', '#391085', '#9e1068'
    ];
    
    // Gerar hash mais robusto para melhor distribuição
    let hash = 0;
    for (let i = 0; i < factoryName.length; i++) {
      const char = factoryName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converte para 32-bit integer
    }
    
    // Usar valor absoluto e módulo para garantir índice válido
    const colorIndex = Math.abs(hash) % colors.length;
    const selectedColor = colors[colorIndex];
    
    console.log(`Factory: ${factoryName} -> Color: ${selectedColor} (index: ${colorIndex})`);
    return selectedColor;
  };

  const handleFactoryFilter = (factoryId) => {
    setSelectedFactory(factoryId);
  };

  const handleSegmentFilter = (segment) => {
    setSelectedSegment(segment);
  };

  const filteredProducts = products.filter(product => {
    const matchesFactory = !selectedFactory || product.factory?.id === selectedFactory;
    const matchesSegment = !selectedSegment || product.segment === selectedSegment;
    return matchesFactory && matchesSegment;
  });

  const uniqueSegments = [...new Set(products.map(p => p.segment).filter(Boolean))];

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
        <h2 className="mb-0 fs-5 fw-semibold">Produtos</h2>
      </div>
      
      {error && (
        <Alert variant="danger" className="mb-3">
          <Alert.Heading>Erro</Alert.Heading>
          {error}
        </Alert>
      )}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button 
          variant="primary"
          onClick={() => setModalVisible(true)}
        >
          <i className="bi bi-plus-circle me-2"></i>
          Novo Produto
        </Button>
      </div>

      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex flex-wrap gap-3 align-items-center">
            <div className="flex-grow-1" style={{ minWidth: '200px' }}>
              <Form.Select
                value={selectedFactory || ''}
                onChange={(e) => handleFactoryFilter(e.target.value || null)}
              >
                <option value="">Todas as fábricas</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </Form.Select>
            </div>
            
            <div className="flex-grow-1" style={{ minWidth: '200px' }}>
              <Form.Select
                value={selectedSegment || ''}
                onChange={(e) => handleSegmentFilter(e.target.value || null)}
              >
                <option value="">Todos os segmentos</option>
                {uniqueSegments.map(segment => (
                  <option key={segment} value={segment}>
                    {segment}
                  </option>
                ))}
              </Form.Select>
            </div>
            
            {(selectedFactory || selectedSegment) && (
              <small className="text-muted">
                {filteredProducts.length} produto(s) encontrado(s)
              </small>
            )}
          </div>
        </Card.Body>
      </Card>

      {filteredProducts.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="bi bi-bag text-muted fs-1"></i>
            <h5 className="mt-3 text-muted">Nenhum produto encontrado</h5>
            <p className="text-muted">Clique em "Novo Produto" para começar</p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {filteredProducts.map(product => (
            <Col xs={12} sm={12} md={6} lg={6} xl={6} key={product.id}>
              <Card className="h-100">
                <div className="position-relative">
                  <CustomImage
                    src={product.imageUrl}
                    alt={product.name}
                    style={{ 
                      height: isMobile ? '300px' : '400px',
                      width: '100%',
                      objectFit: 'cover'
                    }}
                    showPreview={true}
                    onPreview={handlePreview}
                  />
                </div>
                
                <Card.Body className="d-flex flex-column">
                  <div className="text-center mb-3">
                    <h5 className="card-title mb-2">{product.name}</h5>
                    
                    {product.factory && (
                      <div className="mb-2">
                        {(() => {
                          const factoryColor = getFactoryColor(product.factory.name);
                          console.log(`Aplicando cor ${factoryColor} para fábrica: ${product.factory.name}`);
                          return (
                            <Badge 
                              style={{ 
                                backgroundColor: factoryColor,
                                color: 'white',
                                fontSize: isMobile ? '14px' : '18px',
                                padding: isMobile ? '6px 12px' : '12px 24px',
                                border: 'none',
                                fontWeight: '500'
                              }}
                              className="factory-badge"
                            >
                              {product.factory.name}
                            </Badge>
                          );
                        })()}
                      </div>
                    )}
                    
                    <div className="fs-5 fw-bold text-primary mb-3">
                      {product.price && typeof product.price === 'number' ? `¥ ${product.price.toFixed(2)}` : 'Sob consulta'}
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <Button 
                      variant="primary" 
                      className="w-100"
                      onClick={() => handleEdit(product)}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Modal show={modalVisible} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingProduct ? 'Editar Produto' : 'Novo Produto'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Imagem do Produto</Form.Label>
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
              <Form.Control
                type="hidden"
                name="imageUrl"
                defaultValue={editingProduct?.imageUrl || ''}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nome do Produto</Form.Label>
              <Form.Control
                type="text"
                name="name"
                defaultValue={editingProduct?.name || ''}
                placeholder="Digite o nome do produto"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Segmento</Form.Label>
              <Form.Control
                type="text"
                name="segment"
                defaultValue={editingProduct?.segment || ''}
                placeholder="Digite o segmento"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Preço</Form.Label>
              <Form.Control
                type="number"
                name="price"
                step="0.01"
                defaultValue={editingProduct?.price || ''}
                placeholder="Digite o preço"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Fábrica</Form.Label>
              <Form.Select
                name="factoryId"
                defaultValue={editingProduct?.factory?.id || ''}
                required
              >
                <option value="">Selecione uma fábrica</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Descrição</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                defaultValue={editingProduct?.description || ''}
                placeholder="Digite uma descrição"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Salvando...
                </>
              ) : (
                editingProduct ? 'Atualizar' : 'Criar'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={previewVisible} onHide={() => setPreviewVisible(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Visualizar Imagem</Modal.Title>
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