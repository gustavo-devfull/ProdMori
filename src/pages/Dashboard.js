import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Spinner,
  Alert,
  Button,
  Badge,
  Pagination
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import factoryServiceAPI from '../services/factoryServiceAPI';
import tagService from '../services/tagService';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // CSS customizado para garantir que os estilos das tags sejam aplicados
  const customStyles = `
    .tag-unselected {
      background-color: #ababab !important;
      color: white !important;
      border: none !important;
    }
    .tag-selected {
      color: white !important;
      border: none !important;
    }
  `;
  const [loading, setLoading] = useState(true);
  const [allFactories, setAllFactories] = useState([]);
  const [error, setError] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filteredFactories, setFilteredFactories] = useState([]);
  const [factorySearchTerm, setFactorySearchTerm] = useState('');
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [availableTags, setAvailableTags] = useState({
    regiao: [],
    material: [],
    outros: [],
    tipoProduto: []
  });

  // Estado para armazenar tags de cada fábrica
  const [factoryTagsMap, setFactoryTagsMap] = useState({});

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadFactories = useCallback(async (page = currentPage, forceRefresh = false) => {
    console.log('🔄 Iniciando loadFactories...', {
      page,
      forceRefresh
    });
    
    try {
      setLoading(true);
      
      console.log('Carregando fábricas via factoryServiceAPI...');
      
      // Usar factoryServiceAPI.getAllFactories() como na página Factories
      const factories = await factoryServiceAPI.getAllFactories();
      console.log('Dashboard - Fábricas carregadas via factoryServiceAPI:', factories.length);
      
      setAllFactories(factories);
      setTotalPages(1); // Sem paginação por enquanto
      console.log('Dashboard - Fábricas carregadas:', factories.length);
      
    } catch (err) {
      console.error('Erro ao carregar fábricas:', err);
      setError(t('Erro ao carregar fábricas', '加载工厂时出错'));
      setAllFactories([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, t]);

  // Função para carregar tags disponíveis
  const loadAvailableTags = useCallback(async () => {
    try {
      console.log('Dashboard - Carregando tags globais...');
      
      const tags = await tagService.getAllTags();
      console.log('Dashboard - Tags globais carregadas:', tags);
      
      setAvailableTags(tags || {
        regiao: [],
        material: [],
        outros: [],
        tipoProduto: []
      });
    } catch (error) {
      console.error('Erro ao carregar tags globais:', error);
      setAvailableTags({
        regiao: [],
        material: [],
        outros: [],
        tipoProduto: []
      });
    }
  }, []);

  // Função para carregar tags de cada fábrica
  const loadFactoryTags = useCallback(async (factoryId) => {
    try {
      console.log(`Dashboard.loadFactoryTags - Carregando tags para fábrica: ${factoryId}`);
      
      // Forçar sincronização completa para garantir dados atualizados
      await tagService.forceSyncFromFirebase(factoryId);
      
      const factoryTags = await tagService.getFactoryTagsWithAssociations(factoryId);
      console.log(`Dashboard.loadFactoryTags - Tags carregadas para ${factoryId}:`, factoryTags);
      
      // Garantir estrutura consistente
      const safeTags = {
        regiao: Array.isArray(factoryTags?.regiao) ? factoryTags.regiao : [],
        material: Array.isArray(factoryTags?.material) ? factoryTags.material : [],
        outros: Array.isArray(factoryTags?.outros) ? factoryTags.outros : [],
        tipoProduto: Array.isArray(factoryTags?.tipoProduto) ? factoryTags.tipoProduto : []
      };
      
      console.log(`Dashboard.loadFactoryTags - Estrutura final para ${factoryId}:`, safeTags);
      
      setFactoryTagsMap(prev => ({
        ...prev,
        [factoryId]: safeTags
      }));
    } catch (error) {
      console.error(`Erro ao carregar tags da fábrica ${factoryId}:`, error);
      // Em caso de erro, definir estrutura vazia
      setFactoryTagsMap(prev => ({
        ...prev,
        [factoryId]: { regiao: [], material: [], outros: [], tipoProduto: [] }
      }));
    }
  }, []);

  // Carregar dados iniciais apenas uma vez
  useEffect(() => {
    console.log('Dashboard - Carregando dados iniciais...');
    loadFactories();
    loadAvailableTags();
  }, [loadFactories, loadAvailableTags]); // Incluir dependências para evitar warning

  // Escutar eventos de exclusão de fábricas
  useEffect(() => {
    const handleFactoryDeleted = (event) => {
      console.log('Dashboard - Fábrica excluída detectada:', event.detail);
      // Recarregar fábricas imediatamente
      loadFactories(1, true);
    };

    const handleFactoryCreated = (event) => {
      console.log('Dashboard - Nova fábrica criada detectada:', event.detail);
      // Recarregar fábricas imediatamente
      loadFactories(1, true);
    };

    const handleFactoryUpdated = (event) => {
      console.log('Dashboard - Fábrica atualizada detectada:', event.detail);
      // Recarregar fábricas imediatamente
      loadFactories(1, true);
    };

    window.addEventListener('factoryDeleted', handleFactoryDeleted);
    window.addEventListener('factoryCreated', handleFactoryCreated);
    window.addEventListener('factoryUpdated', handleFactoryUpdated);
    
    return () => {
      window.removeEventListener('factoryDeleted', handleFactoryDeleted);
      window.removeEventListener('factoryCreated', handleFactoryCreated);
      window.removeEventListener('factoryUpdated', handleFactoryUpdated);
    };
  }, [loadFactories]);

  // Carregar tags de cada fábrica quando as fábricas forem carregadas (otimizado)
  useEffect(() => {
    if (allFactories.length > 0) {
      console.log(`Dashboard - Carregando tags para ${allFactories.length} fábricas...`);
      
      // Carregar tags de todas as fábricas em paralelo
      const loadAllFactoryTags = async () => {
        const promises = allFactories.map(factory => loadFactoryTags(factory.id));
        await Promise.all(promises);
        console.log('Dashboard - Todas as tags das fábricas foram carregadas');
      };
      
      loadAllFactoryTags();
    }
  }, [allFactories, loadFactoryTags]);

  // Listener para detectar mudanças no cache de fábricas (simplificado)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key && e.key.includes('factories')) {
        console.log('Dashboard - Cache de fábricas alterado, recarregando...');
        loadFactories(currentPage, true);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadFactories, currentPage]);


  useEffect(() => {
    setFilteredFactories(allFactories);
  }, [allFactories]);

  // Executar filtro sempre que as tags selecionadas ou busca mudarem
  useEffect(() => {
    let filtered = allFactories;

    // Filtrar por termo de busca
    if (factorySearchTerm.trim()) {
      const searchTerm = factorySearchTerm.toLowerCase();
      filtered = filtered.filter(factory => 
        factory.name?.toLowerCase().includes(searchTerm) ||
        factory.contactName?.toLowerCase().includes(searchTerm) ||
        factory.address?.toLowerCase().includes(searchTerm) ||
        factory.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por tags selecionadas
    // A fábrica deve ter TODOS os tags selecionados
    if (selectedTags.length > 0) {
      filtered = filtered.filter(factory => {
        const factoryTags = factoryTagsMap[factory.id];
        if (!factoryTags) return false; // Se não temos as tags da fábrica ainda, não mostrar
        
        // Verificar se a fábrica tem todas as tags selecionadas
        return selectedTags.every(selectedTag => {
          // Verificar se a fábrica tem esta tag específica
          const allFactoryTags = [
            ...(factoryTags.regiao || []),
            ...(factoryTags.material || []),
            ...(factoryTags.outros || []),
            ...(factoryTags.tipoProduto || [])
          ];
          
          return allFactoryTags.some(tag => 
            tag.id === selectedTag.id || tag.name === selectedTag.name
          );
        });
      });
    }

    setFilteredFactories(filtered);
  }, [allFactories, selectedTags, factorySearchTerm, factoryTagsMap]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadFactories(page, true);
  };

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => {
      const isSelected = prev.some(t => t.id === tag.id);
      if (isSelected) {
        return prev.filter(t => t.id !== tag.id);
      } else {
        return [...prev, tag];
      }
    });
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setFactorySearchTerm('');
  };

  // Componente para exibir tags da fábrica
  const FactoryTagsDisplay = React.memo(({ factoryId }) => {
    const [tags, setTags] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      const loadFactoryTags = async () => {
        try {
          setIsLoading(true);
          const factoryTags = factoryTagsMap[factoryId] || { regiao: [], material: [], outros: [], tipoProduto: [] };

          const allTags = [
            ...(factoryTags.regiao || []),
            ...(factoryTags.material || []),
            ...(factoryTags.outros || []),
            ...(factoryTags.tipoProduto || [])
          ];

          // Remover duplicatas baseado no ID e nome
          const uniqueTags = allTags.filter((tag, index, self) => 
            index === self.findIndex(t => 
              (t.id && tag.id && t.id === tag.id) || 
              (!t.id && !tag.id && t.name === tag.name && t.division === tag.division)
            )
          );

          // Debug: verificar duplicatas
          if (allTags.length !== uniqueTags.length) {
            console.log(`Dashboard - Removidas ${allTags.length - uniqueTags.length} tags duplicadas para fábrica ${factoryId}`);
          }

          setTags(uniqueTags);
        } catch (error) {
          console.error('Erro ao carregar tags da fábrica:', error);
          setTags([]);
        } finally {
          setIsLoading(false);
        }
      };

      loadFactoryTags();
    }, [factoryId]);

    if (isLoading) {
      return <small className="text-muted">Carregando...</small>;
    }

    if (tags.length === 0) {
      return <small className="text-muted">{t('Sem tags', '无标签')}</small>;
    }

    return (
      <div className="d-flex flex-wrap gap-1">
        {tags.map((tag, index) => (
          <Badge 
            key={`${factoryId}-${tag.id || tag.name}-${index}`} 
            bg={
              tag.division === 'regiao' ? 'primary' : 
              tag.division === 'material' ? 'success' : 
              tag.division === 'tipoProduto' ? 'info' : 
              'danger'
            }
            style={{ fontSize: '12px' }}
          >
            {tag.name}
          </Badge>
        ))}
      </div>
    );
  });

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="lg" />
      </div>
    );
  }

  return (
    <div>
      <style>{customStyles}</style>
      
      {/* Botão Cadastrar Fábrica */}
      <Button 
        variant="success" 
        className="w-100 mb-3"
        size="lg"
        onClick={() => navigate('/factory/create')}
      >
        <i className="bi bi-plus-circle me-2"></i>
        {t('Cadastrar Fábrica', '注册工厂')}
      </Button>

      {/* Botão Filtrar Fábrica */}
      <Button 
        variant="primary" 
        className="w-100 mb-3"
        onClick={() => setShowFilterCard(!showFilterCard)}
      >
        <i className="bi bi-funnel me-2"></i>
        {t('Filtrar Fábrica', '筛选工厂')}
      </Button>

      {/* Card de filtros */}
      {showFilterCard && (
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">{t('Filtrar Fábricas', '筛选工厂')}</h5>
          </Card.Header>
          <Card.Body>
            {/* Busca por texto */}
            <div className="mb-3">
              <label className="form-label">{t('Buscar', '搜索')}</label>
              <input
                type="text"
                className="form-control"
                placeholder={t('Digite o nome da fábrica...', '输入工厂名称...')}
                value={factorySearchTerm}
                onChange={(e) => setFactorySearchTerm(e.target.value)}
              />
            </div>

            {/* Tags selecionadas */}
            {selectedTags.length > 0 && (
              <div className="mb-3">
                <label className="form-label">{t('Tags Selecionadas', '已选标签')}</label>
                <div className="d-flex flex-wrap gap-1">
                  {selectedTags.map((tag, index) => (
                    <Badge 
                      key={tag.id || `selected-${tag.name}-${index}`} 
                      bg={
                        tag.division === 'regiao' ? 'primary' : 
                        tag.division === 'material' ? 'success' : 
                        tag.division === 'tipoProduto' ? 'info' : 
                        'danger'
                      }
                      className="d-flex align-items-center gap-1"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag.name}
                      <i className="bi bi-x"></i>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Filtros por divisão */}
            <div className="row">
              {/* Tags Região */}
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">{t('Região', '地区')}</label>
                <div className="d-flex flex-wrap gap-1">
                  {availableTags.regiao && availableTags.regiao.length > 0 ? 
                    availableTags.regiao.map((tag, index) => (
                      <Badge 
                        key={tag.id || `regiao-${tag.name}-${index}`} 
                        style={{ 
                          backgroundColor: selectedTags.some(t => t.id === tag.id) ? '#0d6efd' : '#ababab',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        className={`d-flex align-items-center gap-1 ${selectedTags.some(t => t.id === tag.id) ? 'tag-selected' : 'tag-unselected'}`}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag.name}
                        {selectedTags.some(t => t.id === tag.id) && <i className="bi bi-check"></i>}
                      </Badge>
                    )) : (
                      <small className="text-muted">{t('Nenhuma tag disponível', '无可用标签')}</small>
                    )
                  }
                </div>
              </div>

              {/* Tags Tipo de Produto */}
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">{t('Tipo de Produto', '产品类型')}</label>
                <div className="d-flex flex-wrap gap-1">
                  {availableTags.tipoProduto && availableTags.tipoProduto.length > 0 ? 
                    availableTags.tipoProduto.map((tag, index) => (
                      <Badge 
                        key={tag.id || `tipoProduto-${tag.name}-${index}`} 
                        bg={selectedTags.some(t => t.id === tag.id) ? 'info' : undefined}
                        style={{ 
                          backgroundColor: selectedTags.some(t => t.id === tag.id) ? undefined : '#ababab',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        className={`d-flex align-items-center gap-1 ${selectedTags.some(t => t.id === tag.id) ? 'tag-selected' : 'tag-unselected'}`}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag.name}
                        {selectedTags.some(t => t.id === tag.id) && <i className="bi bi-check"></i>}
                      </Badge>
                    )) : (
                      <small className="text-muted">{t('Nenhuma tag disponível', '无可用标签')}</small>
                    )
                  }
                </div>
              </div>

              {/* Tags Material */}
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">{t('Material', '材料')}</label>
                <div className="d-flex flex-wrap gap-1">
                  {availableTags.material && availableTags.material.length > 0 ? 
                    availableTags.material.map((tag, index) => (
                      <Badge 
                        key={tag.id || `material-${tag.name}-${index}`} 
                        style={{ 
                          backgroundColor: selectedTags.some(t => t.id === tag.id) ? '#198754' : '#ababab',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        className={`d-flex align-items-center gap-1 ${selectedTags.some(t => t.id === tag.id) ? 'tag-selected' : 'tag-unselected'}`}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag.name}
                        {selectedTags.some(t => t.id === tag.id) && <i className="bi bi-check"></i>}
                      </Badge>
                    )) : (
                      <small className="text-muted">{t('Nenhuma tag disponível', '无可用标签')}</small>
                    )
                  }
                </div>
              </div>

              {/* Tags Outros */}
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">{t('Outros', '其他')}</label>
                <div className="d-flex flex-wrap gap-1">
                  {availableTags.outros && availableTags.outros.length > 0 ? 
                    availableTags.outros.map((tag, index) => (
                      <Badge 
                        key={tag.id || `outros-${tag.name}-${index}`} 
                        style={{ 
                          backgroundColor: selectedTags.some(t => t.id === tag.id) ? '#dc3545' : '#ababab',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                        className={`d-flex align-items-center gap-1 ${selectedTags.some(t => t.id === tag.id) ? 'tag-selected' : 'tag-unselected'}`}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag.name}
                        {selectedTags.some(t => t.id === tag.id) && <i className="bi bi-check"></i>}
                      </Badge>
                    )) : (
                      <small className="text-muted">{t('Nenhuma tag disponível', '无可用标签')}</small>
                    )
                  }
                </div>
              </div>
            </div>

            {/* Botão limpar filtros */}
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" size="sm" onClick={clearFilters}>
                {t('Limpar Filtros', '清除筛选')}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Exibir erro se houver */}
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      {/* Grid de fábricas */}
      <Row>
        {filteredFactories.map(factory => (
          <Col key={factory.id} md={6} lg={4} className="mb-4">
            <Card className="h-100 factory-card">
              <Card.Body>
                {/* Cabeçalho: NOME | BOTÃO */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">{factory.name}</h5>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => navigate(`/factory/${factory.id}`)}
                  >
                    <i className="bi bi-arrow-right me-1"></i>
                    {t('Ver', '查看')}
                  </Button>
                </div>
                
                {/* Tags */}
                <div className="mb-3">
                  <FactoryTagsDisplay factoryId={factory.id} />
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Mensagem quando não há fábricas */}
      {filteredFactories.length === 0 && !loading && (
        <div className="text-center py-5">
          <h4 className="text-muted">{t('Nenhuma fábrica encontrada', '未找到工厂')}</h4>
          <p className="text-muted">
            {selectedTags.length > 0 || factorySearchTerm.trim() 
              ? t('Tente ajustar os filtros', '尝试调整筛选条件')
              : t('Cadastre sua primeira fábrica', '注册您的第一家工厂')
            }
          </p>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <Pagination>
            <Pagination.First 
              onClick={() => handlePageChange(1)} 
              disabled={currentPage === 1}
            />
            <Pagination.Prev 
              onClick={() => handlePageChange(currentPage - 1)} 
              disabled={currentPage === 1}
            />
            
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              if (page > totalPages) return null;
              
              return (
                <Pagination.Item
                  key={page}
                  active={page === currentPage}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Pagination.Item>
              );
            })}
            
            <Pagination.Next 
              onClick={() => handlePageChange(currentPage + 1)} 
              disabled={currentPage === totalPages}
            />
            <Pagination.Last 
              onClick={() => handlePageChange(totalPages)} 
              disabled={currentPage === totalPages}
            />
          </Pagination>
        </div>
      )}

      {/* Informações de paginação */}
      <div className="text-center mt-2 text-muted">
        <small>
          {t('Mostrando', '显示')} {filteredFactories.length} {t('de', '共')} {allFactories.length} {t('fábricas', '工厂')}
          {(selectedTags.length > 0 || factorySearchTerm.trim()) && (
            <span className="ms-2 text-primary">
              ({t('filtradas', '已筛选')})
            </span>
          )}
        </small>
      </div>
    </div>
  );
};

export default Dashboard;