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
import optimizedFirebaseService from '../services/optimizedFirebaseService';
import tagService from '../services/tagService';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [allFactories, setAllFactories] = useState([]);
  const [error, setError] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filteredFactories, setFilteredFactories] = useState([]);
  const [factorySearchTerm, setFactorySearchTerm] = useState('');
  const [showFilterCard, setShowFilterCard] = useState(false);

  // Estados para paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(12); // Fábricas por página

  // Cache duration: 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000;

  const loadFactories = useCallback(async (page = currentPage, forceRefresh = false) => {
    console.log('🔄 Iniciando loadFactories...', {
      page,
      forceRefresh
    });
    
    try {
      setLoading(true);
      
      console.log('Carregando fábricas com paginação...', { page, forceRefresh });
      
      // Se forçar refresh, invalidar cache primeiro
      if (forceRefresh) {
        console.log('Forçando refresh - invalidando cache...');
        await optimizedFirebaseService.invalidateCache('factories');
        
        // Limpar TODOS os caches relacionados a fábricas
        const cacheKeys = [
          'factoriesCache',
          'factoriesCacheTime',
          'cache_factories_page_1_limit_12',
          'cache_time_factories_page_1_limit_12',
          'cache_dashboard_initial_data',
          'cache_time_dashboard_initial_data',
        ];
        
        cacheKeys.forEach(key => {
          localStorage.removeItem(key);
          console.log(`Cache removido: ${key}`);
        });
      }
      
      const result = await optimizedFirebaseService.getFactories(page, pageSize);
      console.log('Dashboard - Resultado do Firebase:', result);
      
      if (result.success && result.data) {
        setAllFactories(result.data.factories || []);
        setTotalPages(Math.ceil((result.data.total || 0) / pageSize));
        console.log('Dashboard - Fábricas carregadas:', result.data.factories?.length || 0);
      } else {
        console.log('Dashboard - Usando fallback do localStorage...');
        
        // Fallback para localStorage
        const cachedData = localStorage.getItem('factoriesCache');
        const cacheTime = localStorage.getItem('factoriesCacheTime');
        
        if (cachedData && cacheTime) {
          const timeDiff = Date.now() - parseInt(cacheTime);
          if (timeDiff < CACHE_DURATION) {
            const parsedData = JSON.parse(cachedData);
            setAllFactories(parsedData.factories || []);
            setTotalPages(Math.ceil((parsedData.total || 0) / pageSize));
            console.log('Dashboard - Dados carregados do cache:', parsedData.factories?.length || 0);
          } else {
            console.log('Dashboard - Cache expirado, usando dados de exemplo...');
            setAllFactories([]);
            setTotalPages(1);
          }
        } else {
          console.log('Dashboard - Nenhum cache encontrado, usando dados de exemplo...');
          setAllFactories([]);
          setTotalPages(1);
        }
      }
      
      // Se ainda não funcionou, tentar busca direta sem cache
      if (forceRefresh && result.fallback) {
        console.log('Tentando busca direta sem cache...');
        try {
          const apiUrl = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('gpreto.space') || window.location.hostname !== 'localhost' 
            ? '/api' 
            : 'http://localhost:3001/api';
          
          const params = new URLSearchParams();
          params.append('col', 'factories');
          params.append('page', page.toString());
          params.append('limit', pageSize.toString());
          params.append('orderBy', 'createdAt');
          params.append('orderDirection', 'desc');

          const response = await fetch(`${apiUrl}/firestore/get?${params.toString()}`);
          const directResult = await response.json();
          
          if (directResult.success && directResult.data) {
            setAllFactories(directResult.data.factories || []);
            setTotalPages(Math.ceil((directResult.data.total || 0) / pageSize));
            console.log('Dashboard - Dados carregados diretamente:', directResult.data.factories?.length || 0);
          }
        } catch (directError) {
          console.error('Erro na busca direta:', directError);
        }
      }
      
    } catch (err) {
      console.error('Erro ao carregar fábricas:', err);
      setError(t('Erro ao carregar fábricas', '加载工厂时出错'));
      setAllFactories([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, t, CACHE_DURATION]);

  // Função para carregar tags disponíveis
  const loadAvailableTags = useCallback(async () => {
    try {
      console.log('Dashboard - Carregando tags globais...');
      
      const tags = await tagService.getAllTags();
      console.log('Dashboard - Tags globais carregadas:', tags);
      
      // Não precisamos mais dos availableTags no Dashboard simplificado
    } catch (error) {
      console.error('Erro ao carregar tags globais:', error);
    }
  }, []);

  useEffect(() => {
    loadFactories();
    loadAvailableTags();
  }, [loadFactories, loadAvailableTags]);

  // Listener para detectar quando o usuário volta para o Dashboard
  useEffect(() => {
    let refreshTimeout;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Dashboard visível novamente - agendando refresh...');
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          loadFactories(currentPage, true);
        }, 5000);
      }
    };

    const handleFocus = () => {
      console.log('Dashboard recebeu foco - agendando refresh...');
      clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        loadFactories(currentPage, true);
      }, 5000);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearTimeout(refreshTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadFactories, currentPage]);

  // Forçar refresh inicial para garantir dados frescos
  useEffect(() => {
    console.log('Dashboard montado - forçando refresh inicial...');
    loadFactories(currentPage, true);
  }, [loadFactories, currentPage]);

  useEffect(() => {
    setFilteredFactories(allFactories);
  }, [allFactories]);

  // Executar filtro sempre que as tags selecionadas ou busca mudarem
  useEffect(() => {
    let filtered = allFactories;

    // Filtrar por tags selecionadas
    if (selectedTags.length > 0) {
      filtered = filtered.filter(factory => {
        return selectedTags.every(selectedTag => {
          return factory.tags && factory.tags.some(tag => 
            tag.id === selectedTag.id || tag.name === selectedTag.name
          );
        });
      });
    }

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

    setFilteredFactories(filtered);
  }, [allFactories, selectedTags, factorySearchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadFactories(page, true);
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setFactorySearchTerm('');
  };

  // Componente para exibir tags da fábrica
  const FactoryTagsDisplay = ({ factoryId }) => {
    const [factoryTags, setFactoryTags] = useState({ regiao: [], material: [], outros: [], tipoProduto: [] });
    const [loadingTags, setLoadingTags] = useState(true);

    useEffect(() => {
      const loadTags = async () => {
        try {
          const tags = await tagService.getFactoryTags(factoryId);
          setFactoryTags(tags || { regiao: [], material: [], outros: [], tipoProduto: [] });
        } catch (error) {
          console.error('Erro ao carregar tags da fábrica:', error);
          setFactoryTags({ regiao: [], material: [], outros: [], tipoProduto: [] });
        } finally {
          setLoadingTags(false);
        }
      };
      loadTags();
    }, [factoryId]);

    if (loadingTags) {
      return <Spinner animation="border" size="sm" />;
    }

    const allTags = [
      ...(factoryTags.regiao || []),
      ...(factoryTags.material || []),
      ...(factoryTags.outros || []),
      ...(factoryTags.tipoProduto || [])
    ];

    if (allTags.length === 0) {
      return <small className="text-muted">{t('Sem tags', '无标签')}</small>;
    }

    return (
      <div className="d-flex flex-wrap gap-1">
        {allTags.map(tag => (
          <Badge 
            key={tag.id} 
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
            <Card 
              className="h-100 factory-card" 
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/factory/${factory.id}`)}
            >
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="card-title mb-0">{factory.name}</h5>
                  <small className="text-muted">
                    {new Date(factory.createdAt).toLocaleDateString()}
                  </small>
                </div>
                
                {factory.contactName && (
                  <p className="card-text mb-1">
                    <strong>{t('Contato', '联系人')}:</strong> {factory.contactName}
                  </p>
                )}
                
                {factory.phone && (
                  <p className="card-text mb-1">
                    <strong>{t('Telefone', '电话')}:</strong> {factory.phone}
                  </p>
                )}
                
                {factory.address && (
                  <p className="card-text mb-2">
                    <strong>{t('Endereço', '地址')}:</strong> {factory.address}
                  </p>
                )}
                
                <div className="mb-2">
                  <small className="text-muted">{t('Tags', '标签')}:</small>
                  <FactoryTagsDisplay factoryId={factory.id} />
                </div>
                
                {factory.description && (
                  <p className="card-text text-muted small">
                    {factory.description.length > 100 
                      ? `${factory.description.substring(0, 100)}...` 
                      : factory.description
                    }
                  </p>
                )}
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