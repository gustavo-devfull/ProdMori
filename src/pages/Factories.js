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
  ListGroup
} from 'react-bootstrap';
import factoryServiceAPI from '../services/factoryServiceAPI';
import imageService from '../services/imageService';
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

  const loadFactories = useCallback(async (showRefresh = false) => {
    try {
      setLoading(true);
      if (showRefresh) setRefreshing(true);
      
      const data = await factoryServiceAPI.getAllFactories();
      setFactories(data);
      setError(null);
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

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      if (editingFactory) {
        await factoryServiceAPI.updateFactory(editingFactory.id, values);
      } else {
        await factoryServiceAPI.createFactory(values);
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

  const handleEdit = (factory) => {
    setEditingFactory(factory);
    setModalVisible(true);
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
        <h2 className="mb-0 fs-5 fw-semibold">{t('Fábricas/Lojas', '工厂/商店')}</h2>
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
          Nova Fábrica/Loja | 新建工厂/商店
        </Button>
        
        <Button 
          variant="outline-secondary"
          onClick={() => loadFactories(true)}
          disabled={refreshing}
        >
          <i className={`bi bi-arrow-clockwise me-2 ${refreshing ? 'spinning' : ''}`}></i>
          Atualizar | 刷新
        </Button>
      </div>

      {factories.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="bi bi-shop text-muted fs-1"></i>
            <h5 className="mt-3 text-muted">Nenhuma fábrica cadastrada | 没有注册的工厂</h5>
            <p className="text-muted">Clique em "Nova Fábrica/Loja" para começar | 点击"新建工厂/商店"开始</p>
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-3">
          {factories.map(factory => (
            <Col xs={12} md={6} lg={4} key={factory.id}>
              <Card className="h-100 shadow-lg">
                <Card.Body>
                  {/* Segmento, Localização e Contatos */}
                  <div className="d-flex flex-wrap gap-3 mb-3">
                    <div className="d-flex align-items-center text-muted small">
                      <i className="bi bi-tag-fill text-primary me-1"></i>
                      <span>{factory.segment || t('Sem segmento', '无行业')}</span>
                    </div>
                    <div className="d-flex align-items-center text-muted small">
                      <i className="bi bi-geo-alt me-1"></i>
                      <span>{factory.location || t('Localização não informada', '位置未提供')}</span>
                    </div>
                  </div>

                  {/* Informações de contato */}
                  <div className="mb-3">
                    {factory.contactName && (
                      <div className="d-flex align-items-center text-muted small mb-1">
                        <i className="bi bi-person me-1"></i>
                        <span>{factory.contactName}</span>
                      </div>
                    )}
                    {factory.phone && (
                      <div className="d-flex align-items-center text-muted small mb-1">
                        <i className="bi bi-telephone me-1"></i>
                        <span>{factory.phone}</span>
                      </div>
                    )}
                    {factory.wechat && (
                      <div className="d-flex align-items-center text-muted small mb-1">
                        <i className="bi bi-chat-dots me-1"></i>
                        <span>{factory.wechat}</span>
                      </div>
                    )}
                    {factory.email && (
                      <div className="d-flex align-items-center text-muted small mb-1">
                        <i className="bi bi-envelope me-1"></i>
                        <span>{factory.email}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Nome da fábrica/loja */}
                  <h5 className="card-title mb-3">{factory.name}</h5>

                  {/* Imagens da fábrica */}
                  {(factory.imageUrl1 || factory.imageUrl2) && (
                    <div className="mb-3">
                      <div className="row g-2">
                        {factory.imageUrl1 && (
                          <div className="col-6">
                            <CustomImage
                              src={factory.imageUrl1}
                              alt={`${factory.name} - Imagem 1`}
                              className="img-fluid rounded"
                              style={{ height: '120px', objectFit: 'cover', width: '100%' }}
                            />
                          </div>
                        )}
                        {factory.imageUrl2 && (
                          <div className="col-6">
                            <CustomImage
                              src={factory.imageUrl2}
                              alt={`${factory.name} - Imagem 2`}
                              className="img-fluid rounded"
                              style={{ height: '120px', objectFit: 'cover', width: '100%' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {factory.products && factory.products.length > 0 && (
                    <div className="mt-3">
                      <div 
                        className="d-flex align-items-center justify-content-between p-2 rounded bg-light cursor-pointer"
                        onClick={() => toggleProductsExpansion(factory.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <span className="fw-medium small">
                          Produtos | 产品 ({factory.products.length})
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
                      {t('Editar', '编辑')}
                    </Button>
                    <Button 
                      variant="danger"
                      size="sm"
                      className="flex-fill fw-semibold"
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja excluir esta fábrica? | 确定要删除这个工厂吗？')) {
                          handleDelete(factory.id);
                        }
                      }}
                    >
                      <i className="bi bi-trash me-1"></i>
                      {t('Excluir', '删除')}
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
                      const imageUrl = await imageService.uploadFile(file);
                      // Armazenar URL da imagem em um campo hidden
                      const hiddenInput = document.querySelector('input[name="imageUrl1"]');
                      if (hiddenInput) {
                        hiddenInput.value = imageUrl;
                      } else {
                        // Criar campo hidden se não existir
                        const form = e.target.closest('form');
                        const hiddenField = document.createElement('input');
                        hiddenField.type = 'hidden';
                        hiddenField.name = 'imageUrl1';
                        hiddenField.value = imageUrl;
                        form.appendChild(hiddenField);
                      }
                    } catch (error) {
                      console.error('Erro no upload da imagem:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    }
                  }
                }}
              />
              <Form.Control
                type="hidden"
                name="imageUrl1"
                defaultValue={editingFactory?.imageUrl1 || ''}
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
                      const imageUrl = await imageService.uploadFile(file);
                      // Armazenar URL da imagem em um campo hidden
                      const hiddenInput = document.querySelector('input[name="imageUrl2"]');
                      if (hiddenInput) {
                        hiddenInput.value = imageUrl;
                      } else {
                        // Criar campo hidden se não existir
                        const form = e.target.closest('form');
                        const hiddenField = document.createElement('input');
                        hiddenField.type = 'hidden';
                        hiddenField.name = 'imageUrl2';
                        hiddenField.value = imageUrl;
                        form.appendChild(hiddenField);
                      }
                    } catch (error) {
                      console.error('Erro no upload da imagem:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    }
                  }
                }}
              />
              <Form.Control
                type="hidden"
                name="imageUrl2"
                defaultValue={editingFactory?.imageUrl2 || ''}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose}>
              {t('Cancelar', '取消')}
            </Button>
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Salvando...', '保存中...')}
                </>
              ) : (
                editingFactory ? t('Atualizar', '更新') : t('Criar', '创建')
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Factories;