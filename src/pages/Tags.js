import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Badge
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import tagService from '../services/tagService';

const Tags = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [newTagName, setNewTagName] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('tipoProduto');
  const [globalTags, setGlobalTags] = useState({
    regiao: [],
    material: [],
    outros: [],
    tipoProduto: []
  });

  console.log('Tags component rendering, loading:', loading);


  // Função para carregar tags globais do Firebase
  const loadGlobalTags = useCallback(async () => {
    try {
      console.log('Carregando tags globais do Firebase...');
      const globalTagsData = await tagService.getAllTags();
      console.log('Tags globais carregadas:', globalTagsData);
      console.log('Tags globais - tipoProduto:', globalTagsData.tipoProduto);
      console.log('Tags globais - tipoProduto length:', globalTagsData.tipoProduto?.length);
      setGlobalTags(globalTagsData);
    } catch (error) {
      console.error('Erro ao carregar tags globais:', error);
      // Fallback para localStorage se Firebase falhar
      try {
        const fallbackTags = await tagService.getAllTags();
        setGlobalTags(fallbackTags);
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError);
        setGlobalTags({ regiao: [], material: [], outros: [], tipoProduto: [] });
      }
    }
  }, []);


  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Carregando tags globais...');
      
      // Carregar tags globais do Firebase
      const globalTagsData = await tagService.getAllTags();
      console.log('Tags globais carregadas:', globalTagsData);
      console.log('Tags globais - tipoProduto:', globalTagsData.tipoProduto);
      console.log('Tags globais - tipoProduto length:', globalTagsData.tipoProduto?.length);
      setGlobalTags(globalTagsData);
      
    } catch (err) {
      console.error('Erro ao carregar tags globais:', err);
      // Fallback para localStorage
      try {
        const savedTags = localStorage.getItem('globalTags');
        if (savedTags) {
          setGlobalTags(JSON.parse(savedTags));
        } else {
          setGlobalTags({ regiao: [], material: [], outros: [], tipoProduto: [] });
        }
      } catch (fallbackError) {
        console.error('Erro no fallback localStorage:', fallbackError);
        setGlobalTags({ regiao: [], material: [], outros: [], tipoProduto: [] });
      }
      setError(t('Erro ao carregar tags', '加载标签时出错'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadGlobalTags();
    loadTags();
    
    // Forçar sincronização com localStorage
    const syncWithLocalStorage = () => {
      const localTags = localStorage.getItem('globalTags');
      const cacheTags = localStorage.getItem('globalTagsCache');
      
      console.log('Tags.js - localStorage globalTags:', localTags);
      console.log('Tags.js - localStorage globalTagsCache:', cacheTags);
      
      if (cacheTags) {
        try {
          const parsedCacheTags = JSON.parse(cacheTags);
          console.log('Tags.js - Parsed cache tags:', parsedCacheTags);
          console.log('Tags.js - Cache tipoProduto:', parsedCacheTags.tipoProduto);
          
          if (parsedCacheTags.tipoProduto && parsedCacheTags.tipoProduto.length > 0) {
            console.log('Tags.js - Sincronizando com cache...');
            setGlobalTags(parsedCacheTags);
          }
        } catch (error) {
          console.error('Tags.js - Erro ao parsear cache:', error);
        }
      }
    };
    
    // Executar sincronização após um pequeno delay
    setTimeout(syncWithLocalStorage, 1000);
  }, [loadGlobalTags, loadTags]);

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

      console.log('Salvando tag global:', newTag);

      // Criar tag global
      const result = await tagService.addTag(newTag);
      
      if (!result.success) {
        setError(result.message);
        return;
      }
      
      // Recarregar tags globais
      await loadTags();
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
    console.log('Function called successfully!');
    
    if (!window.confirm(t('Tem certeza que deseja excluir esta tag?', '确定要删除这个标签吗？'))) {
      console.log('User cancelled deletion');
      return;
    }

    try {
      console.log('Starting global tag deletion...');

      // Deletar tag global
      console.log('Deleting global tag');
      const result = await tagService.removeTag(tagId, division);
      console.log('Remove global tag result:', result);
      
      if (!result.success) {
        console.error('Failed to remove global tag:', result.message);
        setError(result.message);
        return;
      }
      
      // Recarregar tags globais
      console.log('Reloading global tags...');
      await loadTags();
      await loadGlobalTags();
      console.log('Global tags reloaded');
      
      console.log('Tag deletion completed successfully');
    } catch (err) {
      console.error('Error in handleDelete:', err);
      setError(t('Erro ao excluir tag', '删除标签时出错'));
    }
  };

  const handleNewTag = () => {
    setEditingTag(null);
    setNewTagName('');
    setSelectedDivision('regiao');
    setError(null);
    setModalVisible(true);
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingTag(null);
    setNewTagName('');
    setSelectedDivision('regiao');
    setError(null);
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


      {/* Tags Globais */}
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">{t('Tags Globais', '全局标签')}</h5>
            <Button 
              variant="primary" 
              size="sm"
              onClick={handleNewTag}
            >
              <i className="bi bi-plus"></i> {t('Nova Tag', '新建标签')}
            </Button>
          </div>
          
          {/* Exibir todas as tags por divisão */}
            <div>
              {/* Tags Região Globais */}
              {globalTags.regiao && globalTags.regiao.length > 0 && (
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
                        <i 
                          className="bi bi-pencil text-white" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleEdit(tag)}
                          title={t('Editar', '编辑')}
                        ></i>
                        <i 
                          className="bi bi-trash text-white" 
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            console.log('Delete button clicked for regiao tag:', tag.id);
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(tag.id, 'regiao');
                          }}
                          title={t('Excluir', '删除')}
                        ></i>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Tipo de Produto Globais */}
              <div className="mb-3">
                <h6 className="text-warning">{t('Tags Tipo de Produto', '产品类型标签')}</h6>
                <div className="d-flex flex-wrap gap-2">
                  {globalTags.tipoProduto && globalTags.tipoProduto.length > 0 ? (
                    globalTags.tipoProduto.map(tag => (
                      <Badge 
                        key={tag.id || tag.name} 
                        bg="warning" 
                        className="d-flex align-items-center gap-1"
                      >
                        {tag.name}
                        <i 
                          className="bi bi-pencil text-white" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleEdit(tag)}
                          title={t('Editar', '编辑')}
                        ></i>
                        <i 
                          className="bi bi-trash text-white" 
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            console.log('Delete button clicked for tipoProduto tag:', tag.id);
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(tag.id, 'tipoProduto');
                          }}
                          title={t('Excluir', '删除')}
                        ></i>
                      </Badge>
                    ))
                  ) : (
                    <small className="text-muted">{t('Nenhuma tag cadastrada', '没有注册标签')}</small>
                  )}
                </div>
              </div>

              {/* Tags Material Globais */}
              {globalTags.material && globalTags.material.length > 0 && (
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
                        <i 
                          className="bi bi-pencil text-white" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleEdit(tag)}
                          title={t('Editar', '编辑')}
                        ></i>
                        <i 
                          className="bi bi-trash text-white" 
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            console.log('Delete button clicked for material tag:', tag.id);
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(tag.id, 'material');
                          }}
                          title={t('Excluir', '删除')}
                        ></i>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Outros Globais */}
              {globalTags.outros && globalTags.outros.length > 0 && (
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
                        <i 
                          className="bi bi-pencil text-white" 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleEdit(tag)}
                          title={t('Editar', '编辑')}
                        ></i>
                        <i 
                          className="bi bi-trash text-white" 
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            console.log('Delete button clicked for outros tag:', tag.id);
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(tag.id, 'outros');
                          }}
                          title={t('Excluir', '删除')}
                        ></i>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}


              {(!globalTags.regiao || globalTags.regiao.length === 0) && (!globalTags.material || globalTags.material.length === 0) && (!globalTags.outros || globalTags.outros.length === 0) && (!globalTags.tipoProduto || globalTags.tipoProduto.length === 0) && (
                <p className="text-muted text-center">{t('Nenhuma tag global encontrada', '没有找到全局标签')}</p>
              )}
            </div>
        </Card.Body>
      </Card>



      {/* Modal para cadastrar/editar tag */}
      <Modal show={modalVisible} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTag ? t('Editar Tag', '编辑标签') : t('Nova Tag Global', '新建全局标签')}
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
                <option value="tipoProduto">{t('Tags Tipo de Produto', '产品类型标签')}</option>
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

