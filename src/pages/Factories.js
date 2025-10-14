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
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

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
          <Button 
            variant="light"
            size="sm"
            onClick={() => setModalVisible(true)}
            className="d-flex align-items-center"
          >
            <i className="bi bi-plus-circle me-1"></i>
            {t('Nova', '新建')}
          </Button>
        </div>
      </div>

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
          {factories.map(factory => (
            <Col xs={12} md={6} lg={4} key={factory.id}>
              <Card className="h-100 shadow-lg">
                <Card.Body>
                  {/* Nome da fábrica e botão de editar */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="card-title mb-0">{factory.name}</h5>
                    <Button 
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleEdit(factory)}
                      title={t('Editar fábrica', '编辑工厂')}
                    >
                      <i className="bi bi-pencil"></i>
                    </Button>
                  </div>

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
                              showPreview={true}
                              onPreview={handlePreview}
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
                              showPreview={true}
                              onPreview={handlePreview}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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