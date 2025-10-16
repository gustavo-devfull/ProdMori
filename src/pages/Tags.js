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
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import factoryServiceAPI from '../services/factoryServiceAPI';
import tagService from '../services/tagService';

const Tags = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [factories, setFactories] = useState([]);
  const [selectedFactory, setSelectedFactory] = useState('');
  const [tags, setTags] = useState({
    regiao: [],
    material: [],
    outros: []
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [newTagName, setNewTagName] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('regiao');
  const [globalTags, setGlobalTags] = useState({
    regiao: [],
    material: [],
    outros: []
  });
  const [showGlobalTags, setShowGlobalTags] = useState(false);

  console.log('Tags component rendering, loading:', loading, 'factories:', factories.length);

  const loadFactories = useCallback(async () => {
    try {
      const factoriesData = await factoryServiceAPI.getAllFactories();
      setFactories(factoriesData);
    } catch (err) {
      setError(t('Erro ao carregar fábricas', '加载工厂时出错'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Função para carregar tags globais do Firebase
  const loadGlobalTags = useCallback(async () => {
    try {
      console.log('Carregando tags globais do Firebase...');
      const globalTagsData = await tagService.getAllTags();
      console.log('Tags globais carregadas:', globalTagsData);
      setGlobalTags(globalTagsData);
    } catch (error) {
      console.error('Erro ao carregar tags globais:', error);
      // Fallback para localStorage se Firebase falhar
      try {
        const fallbackTags = await tagService.getAllTags();
        setGlobalTags(fallbackTags);
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError);
        setGlobalTags({ regiao: [], material: [], outros: [] });
      }
    }
  }, []);

  // Função para sincronizar tags globais com todas as fábricas
  const syncGlobalTags = useCallback(() => {
    try {
      tagService.syncGlobalTags();
      loadGlobalTags();
    } catch (err) {
      console.error('Erro ao sincronizar tags globais:', err);
    }
  }, [loadGlobalTags]);

  const loadTags = useCallback(async () => {
    if (!selectedFactory) {
      setTags({ regiao: [], material: [], outros: [] });
      return;
    }

    try {
      setLoading(true);
      console.log('Carregando tags da fábrica:', selectedFactory);
      
      // Tentar carregar do Firebase primeiro
      const factoryTags = await tagService.getFactoryTags(selectedFactory);
      console.log('Tags da fábrica carregadas:', factoryTags);
      setTags(factoryTags);
      
    } catch (err) {
      console.error('Erro ao carregar tags do Firebase:', err);
      // Fallback para localStorage
      try {
        const savedTags = localStorage.getItem(`tags_${selectedFactory}`);
        if (savedTags) {
          setTags(JSON.parse(savedTags));
        } else {
          setTags({ regiao: [], material: [], outros: [] });
        }
      } catch (fallbackError) {
        console.error('Erro no fallback localStorage:', fallbackError);
        setTags({ regiao: [], material: [], outros: [] });
      }
      setError(t('Erro ao carregar tags', '加载标签时出错'));
    } finally {
      setLoading(false);
    }
  }, [selectedFactory, t]);

  useEffect(() => {
    loadFactories();
    loadGlobalTags();
  }, [loadFactories, loadGlobalTags]);

  useEffect(() => {
    if (factories.length > 0) {
      syncGlobalTags();
    }
  }, [factories, syncGlobalTags]);

  useEffect(() => {
    if (selectedFactory) {
      loadTags();
    }
  }, [selectedFactory, loadTags]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData.entries());
    
    try {
      setSubmitting(true);
      
      const newTag = {
        id: editingTag?.id || Date.now().toString(),
        name: values.name,
        division: values.division,
        createdAt: editingTag?.createdAt || new Date(),
        updatedAt: new Date()
      };

      console.log('Salvando tag:', newTag, 'Factory:', selectedFactory);

      if (selectedFactory) {
        // Modo fábrica selecionada - criar tag para fábrica específica
        const result = await tagService.addTagToFactory(selectedFactory, newTag);
        
        if (!result.success) {
          setError(result.message);
          return;
        }
        
        // Recarregar tags da fábrica
        await loadTags();
      } else {
        // Modo global - criar tag global diretamente
        const result = await tagService.addTag(newTag);
        if (!result.success) {
          setError(result.message);
          return;
        }
      }
      
      // Recarregar tags globais
      await loadGlobalTags();
      
      setModalVisible(false);
      setEditingTag(null);
      setNewTagName('');
      setError(null);
    } catch (err) {
      setError(t('Erro ao salvar tag', '保存标签时出错'));
      console.error('Erro ao salvar tag:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (tag) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setSelectedDivision(tag.division);
    setModalVisible(true);
  };

  const handleDelete = async (tagId, division) => {
    console.log('=== HANDLE DELETE TAG ===');
    console.log('Tag ID:', tagId);
    console.log('Division:', division);
    console.log('Selected Factory:', selectedFactory);
    
    if (!window.confirm(t('Tem certeza que deseja excluir esta tag?', '确定要删除这个标签吗？'))) {
      console.log('User cancelled deletion');
      return;
    }

    try {
      console.log('Starting tag deletion...');

      if (selectedFactory) {
        // Modo fábrica selecionada - deletar tag da fábrica
        console.log('Deleting tag from factory:', selectedFactory);
        const result = await tagService.removeTagFromFactory(selectedFactory, tagId, division);
        console.log('Remove from factory result:', result);
        
        if (!result.success) {
          console.error('Failed to remove tag from factory:', result.message);
          setError(result.message);
          return;
        }
        
        // Recarregar tags da fábrica
        console.log('Reloading factory tags...');
        await loadTags();
        console.log('Factory tags reloaded');
      } else {
        // Modo global - deletar tag global diretamente
        console.log('Deleting global tag');
        const result = await tagService.removeTag(tagId, division);
        console.log('Remove global tag result:', result);
        
        if (!result.success) {
          console.error('Failed to remove global tag:', result.message);
          setError(result.message);
          return;
        }
      }
      
      // Recarregar tags globais
      console.log('Reloading global tags...');
      await loadGlobalTags();
      console.log('Global tags reloaded');
      
      console.log('Tag deletion completed successfully');
    } catch (err) {
      console.error('Error in handleDelete:', err);
      setError(t('Erro ao excluir tag', '删除标签时出错'));
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingTag(null);
    setNewTagName('');
    setSelectedDivision('regiao');
    setError(null);
  };

  const handleCreateNewTag = () => {
    setEditingTag(null);
    setNewTagName('');
    setSelectedDivision('regiao');
    setError(null);
    setModalVisible(true);
  };

  const handleFactoryChange = (factoryId) => {
    setSelectedFactory(factoryId);
    setError(null);
  };

  const getDivisionLabel = (division) => {
    switch (division) {
      case 'regiao':
        return t('Tags Região', '地区标签');
      case 'material':
        return t('Tags Material', '材料标签');
      case 'outros':
        return t('Tags Outros', '其他标签');
      default:
        return division;
    }
  };

  const getDivisionIcon = (division) => {
    switch (division) {
      case 'regiao':
        return 'bi-geo-alt';
      case 'material':
        return 'bi-box';
      case 'outros':
        return 'bi-tag';
      default:
        return 'bi-tag';
    }
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
        <div className="d-flex justify-content-between align-items-center">
          <h2 className="mb-0 fs-5 fw-semibold">{t('Gerenciamento de Tags', '标签管理')}</h2>
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

      {/* Seletor de Fábrica */}
      <Card className="mb-3">
        <Card.Body>
          <Form.Group>
            <Form.Label>{t('Selecionar Fábrica', '选择工厂')}</Form.Label>
            <Form.Select
              value={selectedFactory}
              onChange={(e) => handleFactoryChange(e.target.value)}
            >
              <option value="">{t('Escolha uma fábrica...', '选择工厂...')}</option>
              {factories.map(factory => (
                <option key={factory.id} value={factory.id}>
                  {factory.name} - {factory.segment || t('Sem segmento', '无行业')}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Card.Body>
      </Card>

      {/* Tags Globais */}
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">{t('Tags Globais', '全局标签')}</h5>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => setShowGlobalTags(!showGlobalTags)}
            >
              {showGlobalTags ? t('Ocultar', '隐藏') : t('Mostrar', '显示')}
            </Button>
          </div>
          
          {showGlobalTags && (
            <div>
              {/* Tags Região Globais */}
              {globalTags.regiao.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-primary">{t('Tags Região', '地区标签')}</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {globalTags.regiao.map(tag => (
                      <Badge 
                        key={tag.id || tag.name} 
                        bg="primary" 
                        className="d-flex align-items-center gap-1"
                      >
                        {tag.name}
                        {!selectedFactory && (
                          <>
                            <i 
                              className="bi bi-pencil text-white" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleEdit(tag)}
                              title={t('Editar', '编辑')}
                            ></i>
                            <i 
                              className="bi bi-trash text-white" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleDelete(tag.id, 'regiao')}
                              title={t('Excluir', '删除')}
                            ></i>
                          </>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Material Globais */}
              {globalTags.material.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-success">{t('Tags Material', '材料标签')}</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {globalTags.material.map(tag => (
                      <Badge 
                        key={tag.id || tag.name} 
                        bg="success" 
                        className="d-flex align-items-center gap-1"
                      >
                        {tag.name}
                        {!selectedFactory && (
                          <>
                            <i 
                              className="bi bi-pencil text-white" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleEdit(tag)}
                              title={t('Editar', '编辑')}
                            ></i>
                            <i 
                              className="bi bi-trash text-white" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleDelete(tag.id, 'material')}
                              title={t('Excluir', '删除')}
                            ></i>
                          </>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Outros Globais */}
              {globalTags.outros.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-danger">{t('Tags Outros', '其他标签')}</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {globalTags.outros.map(tag => (
                      <Badge 
                        key={tag.id || tag.name} 
                        bg="danger" 
                        className="d-flex align-items-center gap-1"
                      >
                        {tag.name}
                        {!selectedFactory && (
                          <>
                            <i 
                              className="bi bi-pencil text-white" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleEdit(tag)}
                              title={t('Editar', '编辑')}
                            ></i>
                            <i 
                              className="bi bi-trash text-white" 
                              style={{ cursor: 'pointer' }}
                              onClick={() => handleDelete(tag.id, 'outros')}
                              title={t('Excluir', '删除')}
                            ></i>
                          </>
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {globalTags.regiao.length === 0 && globalTags.material.length === 0 && globalTags.outros.length === 0 && (
                <p className="text-muted text-center">{t('Nenhuma tag global encontrada', '没有找到全局标签')}</p>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      <div className="d-flex justify-content-end mb-3">
        <Button 
          variant="success"
          onClick={handleCreateNewTag}
          className="d-flex align-items-center"
        >
          <i className="bi bi-plus-circle me-1"></i>
          {selectedFactory ? t('Nova Tag', '新建标签') : t('Nova Tag Global', '新建全局标签')}
        </Button>
      </div>

      {selectedFactory ? (
        <Row className="g-3">
          {Object.entries(tags).map(([division, divisionTags]) => (
            <Col xs={12} md={4} key={division}>
              <Card className="h-100">
                <Card.Header className="d-flex align-items-center">
                  <i className={`bi ${getDivisionIcon(division)} me-2`}></i>
                  <span className="fw-medium">{getDivisionLabel(division)}</span>
                  <Badge bg="secondary" className="ms-auto">
                    {divisionTags.length}
                  </Badge>
                </Card.Header>
                <Card.Body>
                  {divisionTags.length === 0 ? (
                    <div className="text-center py-3">
                      <i className="bi bi-tag text-muted fs-1"></i>
                      <p className="text-muted mt-2 small">
                        {t('Nenhuma tag cadastrada', '没有注册标签')}
                      </p>
                    </div>
                  ) : (
                    <ListGroup variant="flush">
                      {divisionTags.map((tag) => (
                        <ListGroup.Item key={tag.id} className="d-flex justify-content-between align-items-center px-0">
                          <span className="text-truncate">{tag.name}</span>
                          <div className="d-flex gap-1">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => handleEdit(tag)}
                              title={t('Editar tag', '编辑标签')}
                            >
                              <i className="bi bi-pencil"></i>
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleDelete(tag.id, division)}
                              title={t('Excluir tag', '删除标签')}
                            >
                              <i className="bi bi-trash"></i>
                            </Button>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="bi bi-building text-muted fs-1"></i>
            <h5 className="mt-3 text-muted">{t('Selecione uma fábrica', '选择工厂')}</h5>
            <p className="text-muted">{t('Escolha uma fábrica acima para gerenciar suas tags', '选择上面的工厂来管理其标签')}</p>
          </Card.Body>
        </Card>
      )}

      {/* Modal para cadastrar/editar tag */}
      <Modal show={modalVisible} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTag ? t('Editar Tag', '编辑标签') : t('Nova Tag', '新建标签')}
            {!selectedFactory && (
              <small className="text-muted d-block">
                {t('Tag Global', '全局标签')}
              </small>
            )}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>{t('Nome da Tag', '标签名称')}</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder={t('Digite o nome da tag', '输入标签名称')}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Divisão', '分类')}</Form.Label>
              <Form.Select
                name="division"
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
              >
                <option value="regiao">{t('Tags Região', '地区标签')}</option>
                <option value="material">{t('Tags Material', '材料标签')}</option>
                <option value="outros">{t('Tags Outros', '其他标签')}</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose}>
              {t('Cancelar', '取消')}
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={submitting || !newTagName.trim()}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Salvando...', '保存中...')}
                </>
              ) : (
                editingTag ? t('Atualizar', '更新') : t('Criar', '创建')
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Tags;

