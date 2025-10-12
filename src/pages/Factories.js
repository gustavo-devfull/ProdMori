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
  ListGroup
} from 'react-bootstrap';
import factoryService from '../services/factoryService';

const Factories = () => {
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFactory, setEditingFactory] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState(new Set());

  useEffect(() => {
    loadFactories();
  }, []);

  const loadFactories = async (showRefresh = false) => {
    try {
      setLoading(true);
      if (showRefresh) setRefreshing(true);
      
      const data = await factoryService.getAllFactories();
      setFactories(data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar fábricas');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      if (editingFactory) {
        await factoryService.updateFactory(editingFactory.id, values);
      } else {
        await factoryService.createFactory(values);
      }
      
      setModalVisible(false);
      setEditingFactory(null);
      await loadFactories();
    } catch (err) {
      setError('Erro ao salvar fábrica');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (factory) => {
    setEditingFactory(factory);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await factoryService.deleteFactory(id);
      await loadFactories();
    } catch (err) {
      setError('Erro ao excluir fábrica');
      console.error(err);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingFactory(null);
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
        <h2 className="mb-0 fs-5 fw-semibold">Fábricas/Lojas</h2>
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
          Nova Fábrica/Loja
        </Button>
        
        <Button 
          variant="outline-secondary"
          onClick={() => loadFactories(true)}
          disabled={refreshing}
        >
          <i className={`bi bi-arrow-clockwise me-2 ${refreshing ? 'spinning' : ''}`}></i>
          Atualizar
        </Button>
      </div>

      {factories.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="bi bi-shop text-muted fs-1"></i>
            <h5 className="mt-3 text-muted">Nenhuma fábrica cadastrada</h5>
            <p className="text-muted">Clique em "Nova Fábrica/Loja" para começar</p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {factories.map(factory => (
            <Col xs={12} md={6} lg={4} key={factory.id}>
              <Card className="h-100">
                <Card.Body>
                  {/* Segmento, Localização e Contato na mesma linha */}
                  <div className="d-flex flex-wrap gap-3 mb-3">
                    <div className="d-flex align-items-center text-muted small">
                      <i className="bi bi-tag-fill text-primary me-1"></i>
                      <span>{factory.segment || 'Sem segmento'}</span>
                    </div>
                    <div className="d-flex align-items-center text-muted small">
                      <i className="bi bi-geo-alt me-1"></i>
                      <span>{factory.location || 'Localização não informada'}</span>
                    </div>
                    <div className="d-flex align-items-center text-muted small">
                      <i className="bi bi-telephone me-1"></i>
                      <span>{factory.contact || 'Contato não informado'}</span>
                    </div>
                  </div>
                  
                  {/* Nome da fábrica/loja */}
                  <h5 className="card-title mb-3">{factory.name}</h5>

                  {factory.products && factory.products.length > 0 && (
                    <div className="mt-3">
                      <div 
                        className="d-flex align-items-center justify-content-between p-2 rounded bg-light cursor-pointer"
                        onClick={() => toggleProductsExpansion(factory.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="fw-medium small">
                          Produtos ({factory.products.length})
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
                                    {product.price ? `¥ ${product.price.toFixed(2)}` : 'Sob consulta'}
                                  </small>
                                </div>
                              </ListGroup.Item>
                            ))}
                          </ListGroup>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-3">
                    <Button 
                      variant="primary"
                      size="sm"
                      className="flex-fill fw-semibold"
                      onClick={() => handleEdit(factory)}
                    >
                      <i className="bi bi-pencil me-1"></i>
                      Editar
                    </Button>
                    <Button 
                      variant="danger"
                      size="sm"
                      className="flex-fill fw-semibold"
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja excluir esta fábrica?')) {
                          handleDelete(factory.id);
                        }
                      }}
                    >
                      <i className="bi bi-trash me-1"></i>
                      Excluir
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
            {editingFactory ? 'Editar Fábrica/Loja' : 'Nova Fábrica/Loja'}
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
              <Form.Label>Nome da Fábrica/Loja</Form.Label>
              <Form.Control
                type="text"
                name="name"
                defaultValue={editingFactory?.name || ''}
                placeholder="Digite o nome da fábrica/loja"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contato</Form.Label>
              <Form.Control
                type="text"
                name="contact"
                defaultValue={editingFactory?.contact || ''}
                placeholder="Digite o contato (telefone, email, etc.)"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Localização</Form.Label>
              <Form.Control
                type="text"
                name="location"
                defaultValue={editingFactory?.location || ''}
                placeholder="Digite a localização"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Segmento</Form.Label>
              <Form.Control
                type="text"
                name="segment"
                defaultValue={editingFactory?.segment || ''}
                placeholder="Digite o segmento de atuação"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Descrição</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                defaultValue={editingFactory?.description || ''}
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
                editingFactory ? 'Atualizar' : 'Criar'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Factories;