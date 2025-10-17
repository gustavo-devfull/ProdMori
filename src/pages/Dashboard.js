import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Spinner,
  Alert,
  Button,
  Form,
  Modal,
  Badge,
  Pagination
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import optimizedFirebaseService from '../services/optimizedFirebaseService';
import imageService from '../services/imageService';
import tagService from '../services/tagService';
import factoryServiceAPI from '../services/factoryServiceAPI';
import { useLanguage } from '../contexts/LanguageContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [allFactories, setAllFactories] = useState([]);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage] = useState('');
  const [uploadingImages, setUploadingImages] = useState({ image1: false, image2: false });
  const [imageUrls, setImageUrls] = useState({ image1: '', image2: '' });
  const [factoryTags, setFactoryTags] = useState({
    regiao: [],
    material: [],
    outros: [],
    tipoProduto: []
  });
  const [newTagInputs, setNewTagInputs] = useState({
    regiao: '',
    material: '',
    outros: '',
    tipoProduto: ''
  });
  const [availableTags, setAvailableTags] = useState({
    regiao: [],
    material: [],
    outros: [],
    tipoProduto: []
  });
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
    // Evitar refresh durante uploads ativos
    if (uploadingImages.image1 || uploadingImages.image2) {
      console.log('🚫 Upload em andamento - pulando refresh...', {
        image1: uploadingImages.image1,
        image2: uploadingImages.image2,
        forceRefresh,
        page
      });
      return;
    }
    
    console.log('🔄 Iniciando loadFactories...', {
      page,
      forceRefresh,
      modalVisible,
      uploadingImages
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
          'factories_page_1_limit_12',
          'factories_page_1_limit_12_{}'
        ];
        
        cacheKeys.forEach(key => {
          localStorage.removeItem(key);
          localStorage.removeItem(`cache_${key}`);
          localStorage.removeItem(`cache_time_${key}`);
        });
        
        // Limpar cache do IndexedDB também
        try {
          const cacheService = await import('../services/cacheService');
          await cacheService.default.clearAll();
          console.log('Cache do IndexedDB limpo');
        } catch (error) {
          console.warn('Erro ao limpar IndexedDB:', error);
        }
        
        // Limpar cache em memória do cacheService
        try {
          const cacheService = await import('../services/cacheService');
          cacheService.default.memoryCache.clear();
          console.log('Cache em memória limpo');
        } catch (error) {
          console.warn('Erro ao limpar cache em memória:', error);
        }
      }
      
      const result = await optimizedFirebaseService.getPaginatedData('factories', {
        page,
        limit: pageSize,
        filters: {},
        forceRefresh
      });
      
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

          const directResponse = await fetch(`${apiUrl}/firestore/get/paginated?${params}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store'
          });

          const directResult = await directResponse.json();
          console.log('Resultado da busca direta:', directResult);
          
          if (directResponse.ok && !directResult.fallback) {
            setAllFactories(directResult.data);
            setTotalPages(directResult.pagination.pages);
            setCurrentPage(directResult.pagination.page);
            console.log(`Fábricas carregadas diretamente: ${directResult.data.length} de ${directResult.pagination.total}`);
            return;
          }
        } catch (directError) {
          console.error('Erro na busca direta:', directError);
        }
      }
      
      if (result.success) {
        if (result.fallback && result.data.length === 0) {
          // Firebase indisponível, usar dados de exemplo
          console.log('Firebase indisponível, usando dados de exemplo...');
          const exampleFactories = [
            { id: '1', name: 'Fábrica Exemplo 1', contactName: 'João Silva', phone: '123-456-7890', wechat: 'joao123', email: 'joao@exemplo.com', location: 'Shanghai', imageUrl1: '', imageUrl2: '' },
            { id: '2', name: 'Fábrica Exemplo 2', contactName: 'Maria Santos', phone: '987-654-3210', wechat: 'maria456', email: 'maria@exemplo.com', location: 'Guangzhou', imageUrl1: '', imageUrl2: '' },
            { id: '3', name: 'Fábrica Exemplo 3', contactName: 'Pedro Costa', phone: '555-123-4567', wechat: 'pedro789', email: 'pedro@exemplo.com', location: 'Shenzhen', imageUrl1: '', imageUrl2: '' }
          ];
          setAllFactories(exampleFactories);
          setTotalPages(1);
          setCurrentPage(1);
          console.log(`Fábricas de exemplo carregadas: ${exampleFactories.length}`);
        } else {
          setAllFactories(result.data);
          setTotalPages(result.pagination.pages);
          setCurrentPage(result.pagination.page);
          console.log(`Fábricas carregadas: ${result.data.length} de ${result.pagination.total}`);
        }
      } else {
        throw new Error(result.error || 'Erro ao carregar fábricas');
      }
      
    } catch (err) {
      console.error('Erro ao carregar fábricas:', err);
      setError(t('Erro ao carregar fábricas', '加载工厂时出错'));
      setAllFactories([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, t, uploadingImages, modalVisible]);

  // Função para carregar tags disponíveis
  const loadAvailableTags = useCallback(async () => {
    try {
      console.log('Dashboard - Carregando tags globais...');
      
      // Debug: Verificar localStorage
      const globalTagsFromStorage = localStorage.getItem('globalTags');
      console.log('Dashboard - globalTags do localStorage:', globalTagsFromStorage);
      
      // Verificar cache primeiro
      const cachedTags = localStorage.getItem('globalTagsCache');
      const cacheTime = localStorage.getItem('globalTagsCacheTime');
      
      if (cachedTags && cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
        console.log('Carregando tags do cache...');
        const cachedGlobalTags = JSON.parse(cachedTags);
        const safeTags = {
          regiao: Array.isArray(cachedGlobalTags?.regiao) ? cachedGlobalTags.regiao : [],
          material: Array.isArray(cachedGlobalTags?.material) ? cachedGlobalTags.material : [],
          outros: Array.isArray(cachedGlobalTags?.outros) ? cachedGlobalTags.outros : [],
          tipoProduto: Array.isArray(cachedGlobalTags?.tipoProduto) ? cachedGlobalTags.tipoProduto : []
        };
        console.log('Dashboard - Tags do cache:', safeTags);
        
        // Se o cache está vazio, ignorar e buscar do Firebase
        if (safeTags.regiao.length === 0 && safeTags.material.length === 0 && safeTags.outros.length === 0 && safeTags.tipoProduto.length === 0) {
          console.log('Cache vazio detectado, ignorando cache e buscando do Firebase...');
        } else {
          setAvailableTags(safeTags);
          return;
        }
      }
      
      console.log('Carregando tags globais do Firebase...');
      // Buscar apenas tags globais (sem factoryId)
      const apiUrl = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('gpreto.space') || window.location.hostname !== 'localhost' 
        ? '/api' 
        : 'http://localhost:3001/api';
      
      let result;
      try {
        const response = await fetch(`${apiUrl}/firestore/get/tags`);
        result = await response.json();
        console.log('Dashboard - Resposta direta do Firebase:', result);
        
        // Se houver erro de quota ou Firebase indisponível, usar localStorage
        if (!response.ok || result.fallback || result.error) {
          console.log('Firebase indisponível ou erro de quota, usando localStorage');
          throw new Error('Firebase error');
        }
      } catch (error) {
        console.log('Erro ao carregar do Firebase, usando localStorage:', error);
        // Fallback para localStorage
        const savedTags = localStorage.getItem('globalTags');
        if (savedTags) {
          const parsedTags = JSON.parse(savedTags);
          const safeTags = {
            regiao: Array.isArray(parsedTags?.regiao) ? parsedTags.regiao : [],
            material: Array.isArray(parsedTags?.material) ? parsedTags.material : [],
            outros: Array.isArray(parsedTags?.outros) ? parsedTags.outros : []
          };
          console.log('Dashboard - Tags do localStorage:', safeTags);
          setAvailableTags(safeTags);
          return;
        } else {
          console.log('Nenhuma tag encontrada no localStorage');
          setAvailableTags({ regiao: [], material: [], outros: [], tipoProduto: [] });
          return;
        }
      }
      
      const tags = result.data || [];
      console.log('Dashboard - Tags globais carregadas:', tags);
      
      // Processar tags do Firebase - lidar com diferentes estruturas
      const processedTags = [];
      const seenTags = new Set();
      
      tags.forEach(tag => {
        // Verificar se é uma tag global (sem factoryId) ou se tem tagData
        const isGlobalTag = !tag.factoryId;
        const hasTagData = tag.tagData;
        
        if (isGlobalTag || hasTagData) {
          let tagInfo;
          
          if (hasTagData) {
            // Estrutura com tagData
            tagInfo = {
              id: tag.tagData.id || tag.id,
              name: tag.tagData.name,
              division: tag.tagData.division,
              createdAt: tag.tagData.createdAt || tag.createdAt
            };
          } else {
            // Estrutura direta
            tagInfo = {
              id: tag.id,
              name: tag.name,
              division: tag.division,
              createdAt: tag.createdAt
            };
          }
          
          const tagKey = `${tagInfo.name}_${tagInfo.division}`;
          if (!seenTags.has(tagKey)) {
            seenTags.add(tagKey);
            processedTags.push(tagInfo);
          }
        }
      });
      
      console.log('Dashboard - Tags processadas (sem duplicatas):', processedTags);
      
      // Organizar tags por divisão
      let safeTags = {
        regiao: processedTags.filter(tag => tag.division === 'regiao'),
        material: processedTags.filter(tag => tag.division === 'material'),
        outros: processedTags.filter(tag => tag.division === 'outros'),
        tipoProduto: processedTags.filter(tag => tag.division === 'tipoProduto')
      };
      
      // Se não há tags do Firebase, usar localStorage como fallback
      if (safeTags.regiao.length === 0 && safeTags.material.length === 0 && safeTags.outros.length === 0 && safeTags.tipoProduto.length === 0) {
        console.log('Nenhuma tag do Firebase, usando localStorage...');
        const localGlobalTags = JSON.parse(localStorage.getItem('globalTags') || '{"regiao":[],"material":[],"outros":[],"tipoProduto":[]}');
        safeTags = {
          regiao: Array.isArray(localGlobalTags?.regiao) ? localGlobalTags.regiao : [],
          material: Array.isArray(localGlobalTags?.material) ? localGlobalTags.material : [],
          outros: Array.isArray(localGlobalTags?.outros) ? localGlobalTags.outros : [],
          tipoProduto: Array.isArray(localGlobalTags?.tipoProduto) ? localGlobalTags.tipoProduto : []
        };
      }
      
      console.log('Dashboard - Tags organizadas por divisão:', safeTags);
      console.log('Dashboard - tipoProduto:', safeTags.tipoProduto);
      console.log('Dashboard - tipoProduto length:', safeTags.tipoProduto?.length);
      setAvailableTags(safeTags);
      
      // Salvar no cache
      localStorage.setItem('globalTagsCache', JSON.stringify(safeTags));
      localStorage.setItem('globalTagsCacheTime', Date.now().toString());
      
    } catch (error) {
      console.error('Erro ao carregar tags disponíveis:', error);
      // Fallback para localStorage
      try {
        const localGlobalTags = JSON.parse(localStorage.getItem('globalTags') || '{"regiao":[],"material":[],"outros":[],"tipoProduto":[]}');
        
        // Se não há tags no localStorage, criar algumas de exemplo
        if (localGlobalTags.regiao.length === 0 && localGlobalTags.material.length === 0 && localGlobalTags.outros.length === 0 && localGlobalTags.tipoProduto.length === 0) {
          console.log('Criando tags de exemplo no localStorage...');
          const exampleTags = {
            regiao: [
              { id: '1', name: 'Norte', division: 'regiao', createdAt: new Date() },
              { id: '2', name: 'Sul', division: 'regiao', createdAt: new Date() },
              { id: '3', name: 'Leste', division: 'regiao', createdAt: new Date() },
              { id: '4', name: 'Oeste', division: 'regiao', createdAt: new Date() },
              { id: '5', name: 'Centro', division: 'regiao', createdAt: new Date() }
            ],
            material: [
              { id: '6', name: 'Alumínio', division: 'material', createdAt: new Date() },
              { id: '7', name: 'Aço', division: 'material', createdAt: new Date() },
              { id: '8', name: 'Plástico', division: 'material', createdAt: new Date() },
              { id: '9', name: 'Madeira', division: 'material', createdAt: new Date() },
              { id: '10', name: 'Vidro', division: 'material', createdAt: new Date() }
            ],
            outros: [
              { id: '11', name: 'Premium', division: 'outros', createdAt: new Date() },
              { id: '12', name: 'Econômico', division: 'outros', createdAt: new Date() },
              { id: '13', name: 'Exportação', division: 'outros', createdAt: new Date() },
              { id: '14', name: 'Certificado', division: 'outros', createdAt: new Date() }
            ],
            tipoProduto: [
              { id: '15', name: 'Eletrônico', division: 'tipoProduto', createdAt: new Date() },
              { id: '16', name: 'Móvel', division: 'tipoProduto', createdAt: new Date() },
              { id: '17', name: 'Decoração', division: 'tipoProduto', createdAt: new Date() },
              { id: '18', name: 'Automotivo', division: 'tipoProduto', createdAt: new Date() },
              { id: '19', name: 'Esportivo', division: 'tipoProduto', createdAt: new Date() }
            ]
          };
          localStorage.setItem('globalTags', JSON.stringify(exampleTags));
          localStorage.setItem('globalTagsCache', JSON.stringify(exampleTags));
          localStorage.setItem('globalTagsCacheTime', Date.now().toString());
          setAvailableTags(exampleTags);
        } else {
          setAvailableTags(localGlobalTags);
        }
      } catch (fallbackError) {
        console.error('Erro no fallback localStorage:', fallbackError);
        setAvailableTags({
          regiao: [],
          material: [],
          outros: []
        });
      }
    }
  }, [CACHE_DURATION]);

  // Função para mudar de página
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    loadFactories(page);
  }, [loadFactories]);

  // Função para filtrar fábricas por tags selecionadas
  const filterFactoriesByTags = useCallback(async () => {
    if (selectedTags.length === 0) {
      setFilteredFactories(allFactories);
      return;
    }

    try {
      console.log('=== FILTRO DE FÁBRICAS POR TAGS ===');
      console.log('Tags selecionadas:', selectedTags);
      console.log('Total de fábricas:', allFactories.length);
      
      const filtered = [];
      for (const factory of allFactories) {
        // Verificar cache para tags da fábrica
        const cacheKey = `factoryTags_${factory.id}`;
        const cachedFactoryTags = localStorage.getItem(cacheKey);
        const cacheTime = localStorage.getItem(`${cacheKey}_time`);
        
        let factoryTags;
        if (cachedFactoryTags && cacheTime && (Date.now() - parseInt(cacheTime)) < CACHE_DURATION) {
          console.log(`Usando cache para tags da fábrica ${factory.name}`);
          factoryTags = JSON.parse(cachedFactoryTags);
        } else {
          console.log(`Carregando tags da fábrica ${factory.name} do Firebase`);
          try {
            factoryTags = await tagService.getFactoryTags(factory.id);
            // Salvar no cache
            localStorage.setItem(cacheKey, JSON.stringify(factoryTags));
            localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
          } catch (error) {
            console.error(`Erro ao carregar tags da fábrica ${factory.name}:`, error);
            // Usar cache expirado se disponível
            if (cachedFactoryTags) {
              factoryTags = JSON.parse(cachedFactoryTags);
            } else {
              factoryTags = { regiao: [], material: [], outros: [], tipoProduto: [] };
            }
          }
        }
        
        const allFactoryTags = [
          ...(factoryTags?.regiao || []),
          ...(factoryTags?.material || []),
          ...(factoryTags?.outros || []),
          ...(factoryTags?.tipoProduto || [])
        ];
        
        console.log(`Fábrica ${factory.name} (${factory.id}):`, {
          factoryTags: factoryTags,
          allFactoryTags: allFactoryTags,
          allFactoryTagIds: allFactoryTags.map(t => t.id)
        });
        
        // Verificar se a fábrica tem TODAS as tags selecionadas (AND)
        const hasAllSelectedTags = selectedTags.every(selectedTag => {
          const found = allFactoryTags.some(factoryTag => {
            const match = factoryTag.id === selectedTag.id || factoryTag.name === selectedTag.name;
            if (match) {
              console.log(`✓ Tag encontrada: ${factoryTag.name} (${factoryTag.id}) === ${selectedTag.name} (${selectedTag.id})`);
            }
            return match;
          });
          if (!found) {
            console.log(`✗ Tag não encontrada: ${selectedTag.name} (${selectedTag.id})`);
          }
          return found;
        });
        
        console.log(`Fábrica ${factory.name} tem todas as tags selecionadas:`, hasAllSelectedTags);
        
        if (hasAllSelectedTags) {
          filtered.push(factory);
        }
      }
      
      console.log('Fábricas filtradas:', filtered.length, filtered.map(f => f.name));
      setFilteredFactories(filtered);
    } catch (error) {
      console.error('Erro ao filtrar fábricas por tags:', error);
      setFilteredFactories(allFactories);
    }
  }, [selectedTags, allFactories, CACHE_DURATION]);

  // Função para filtrar fábricas por busca de nome
  const filterFactoriesBySearch = useCallback(() => {
    if (!factorySearchTerm.trim()) {
      return allFactories;
    }
    
    const searchLower = factorySearchTerm.toLowerCase();
    return allFactories.filter(factory => 
      factory.name?.toLowerCase().includes(searchLower)
    );
  }, [allFactories, factorySearchTerm]);

  // Função para limpar todas as tags selecionadas
  const clearSelectedTags = () => {
    setSelectedTags([]);
  };

  // Função para alternar seleção de tag
  const toggleTagSelection = (tag) => {
    console.log('=== TOGGLE TAG SELECTION ===');
    console.log('Tag clicada:', tag);
    
    setSelectedTags(prev => {
      const isSelected = prev.some(selectedTag => selectedTag.id === tag.id);
      console.log('Tag já selecionada:', isSelected);
      console.log('Tags atuais:', prev);
      
      if (isSelected) {
        const newTags = prev.filter(selectedTag => selectedTag.id !== tag.id);
        console.log('Removendo tag. Novas tags:', newTags);
        return newTags;
      } else {
        const newTags = [...prev, tag];
        console.log('Adicionando tag. Novas tags:', newTags);
        return newTags;
      }
    });
    
    // O filtro será executado automaticamente pelo useEffect
  };

  useEffect(() => {
    loadFactories();
    loadAvailableTags();
  }, [loadFactories, loadAvailableTags]);

  // Listener para detectar quando o usuário volta para o Dashboard
  useEffect(() => {
    let refreshTimeout;
    
    const handleVisibilityChange = () => {
      // Não fazer refresh se modal estiver aberto OU se houver upload ativo
      if (!document.hidden && !modalVisible && !uploadingImages.image1 && !uploadingImages.image2) {
        console.log('Dashboard visível novamente - agendando refresh...');
        // Aguardar um pouco antes de fazer refresh para evitar conflitos com uploads
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          // Verificar novamente antes de executar o refresh
          if (!uploadingImages.image1 && !uploadingImages.image2 && !modalVisible) {
            loadFactories(currentPage, true);
          }
        }, 3000);
      }
    };

    const handleFocus = () => {
      // Não fazer refresh se modal estiver aberto OU se houver upload ativo
      if (!modalVisible && !uploadingImages.image1 && !uploadingImages.image2) {
        console.log('Dashboard recebeu foco - agendando refresh...');
        // Aguardar um pouco antes de fazer refresh para evitar conflitos com uploads
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(() => {
          // Verificar novamente antes de executar o refresh
          if (!uploadingImages.image1 && !uploadingImages.image2 && !modalVisible) {
            loadFactories(currentPage, true);
          }
        }, 3000);
      }
    };

    // Adicionar listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearTimeout(refreshTimeout);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadFactories, currentPage, modalVisible, uploadingImages.image1, uploadingImages.image2]);

  // Forçar refresh inicial para garantir dados frescos
  useEffect(() => {
    console.log('Dashboard montado - forçando refresh inicial...');
    loadFactories(currentPage, true);
  }, [loadFactories, currentPage]); // Executar quando o componente monta ou dependências mudam

  useEffect(() => {
    setFilteredFactories(allFactories);
  }, [allFactories]);

  // Executar filtro sempre que as tags selecionadas ou busca mudarem
  useEffect(() => {
    const applyFilters = async () => {
      let filtered = allFactories;
      
      // Aplicar filtro de busca por nome
      if (factorySearchTerm.trim()) {
        filtered = filterFactoriesBySearch();
      }
      
      // Aplicar filtro de tags
      if (selectedTags.length > 0) {
        console.log('Tags selecionadas mudaram, executando filtro...');
        await filterFactoriesByTags();
        // O filtro de tags já atualiza o estado, então não precisamos fazer nada aqui
        return;
      } else {
        console.log('Nenhuma tag selecionada, aplicando apenas filtro de busca');
        setFilteredFactories(filtered);
      }
    };
    
    applyFilters();
  }, [selectedTags, factorySearchTerm, filterFactoriesByTags, filterFactoriesBySearch, allFactories]);

  const handleFactorySelect = (factoryId) => {
    if (factoryId) {
      // Navegar para a página da fábrica específica
      navigate(`/factory/${factoryId}`);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      // Verificar se há uploads em andamento
      if (uploadingImages.image1 || uploadingImages.image2) {
        console.log('Aguardando upload das imagens...');
        setError(t('Aguarde o upload das imagens terminar', '等待图片上传完成'));
        setSubmitting(false); // Resetar estado de submitting
        return;
      }
      
      // Usar as URLs das imagens do estado do React
      const finalValues = {
        ...values,
        imageUrl1: imageUrls.image1 || values.imageUrl1,
        imageUrl2: imageUrls.image2 || values.imageUrl2
      };
      
      // Criar fábrica usando o serviço
      const newFactory = await factoryServiceAPI.createFactory(finalValues);
      
      // Salvar as tags da fábrica usando o serviço
      if (newFactory && newFactory.id) {
        console.log('=== SAVING FACTORY TAGS ===');
        console.log('Factory ID:', newFactory.id);
        console.log('Factory tags to save:', factoryTags);
        
        Object.keys(factoryTags).forEach(division => {
          console.log(`Processing division: ${division}`);
          factoryTags[division].forEach(tag => {
            console.log(`Saving tag: ${tag.name} (${tag.id}) to factory ${newFactory.id}`);
            tagService.addTagToFactory(newFactory.id, tag);
          });
        });
        
        console.log('All factory tags saved');
      }
      
      setModalVisible(false);
      await loadFactories();
      setError(null);
      
      // Redirecionar para a página da fábrica individual
      if (newFactory && newFactory.id) {
        console.log('Redirecionando para fábrica:', newFactory.id);
        navigate(`/factory/${newFactory.id}`);
      }
    } catch (err) {
      setError(t('Erro ao salvar fábrica', '保存工厂时出错'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setError(null);
    // Limpar estado das imagens
    setImageUrls({ image1: '', image2: '' });
    setUploadingImages({ image1: false, image2: false });
    resetFactoryTags();
  };

  // Funções para gerenciar tags
  const addTagToFactory = (tag, division) => {
    setFactoryTags(prev => ({
      ...prev,
      [division]: [...prev[division], tag]
    }));
  };

  const removeTagFromFactory = (tagId, division) => {
    setFactoryTags(prev => ({
      ...prev,
      [division]: prev[division].filter(tag => tag.id !== tagId)
    }));
  };

  const addNewTagToFactory = (division) => {
    const tagName = newTagInputs[division].trim();
    if (!tagName) return;

    console.log('=== ADD NEW TAG TO FACTORY ===');
    console.log('Division:', division);
    console.log('Tag name:', tagName);
    console.log('Current factory tags:', factoryTags);

    const newTag = {
      id: Date.now().toString(),
      name: tagName,
      division: division,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('New tag created:', newTag);

    // Adicionar ao serviço global de tags
    const result = tagService.addTag(newTag);
    console.log('Add tag result:', result);
    
    if (result.success) {
      // Adicionar à fábrica atual
      console.log('Adding tag to factory...');
      addTagToFactory(newTag, division);
      console.log('Tag added to factory. New factory tags:', factoryTags);
      
      // Atualizar tags disponíveis
      loadAvailableTags();
    } else {
      console.error('Failed to add tag:', result.message);
      setError(result.message);
    }

    // Limpar input
    setNewTagInputs(prev => ({
      ...prev,
      [division]: ''
    }));
  };

  // Função para adicionar tag disponível à fábrica
  const addAvailableTagToFactory = (tag) => {
    addTagToFactory(tag, tag.division);
    
    // Remover da lista de disponíveis
    setAvailableTags(prev => ({
      ...prev,
      [tag.division]: prev[tag.division].filter(t => t.id !== tag.id)
    }));
  };

  const resetFactoryTags = () => {
    setFactoryTags({
      regiao: [],
      material: [],
      outros: [],
      tipoProduto: []
    });
    setNewTagInputs({
      regiao: '',
      material: '',
      outros: '',
      tipoProduto: ''
    });
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
        onClick={() => setModalVisible(true)}
      >
        <i className="bi bi-plus-circle me-2"></i>
        {t('Cadastrar Fábrica', '注册工厂')}
      </Button>

      {/* Botão Filtrar Fábrica */}
      <Button 
        variant="primary" 
        className="w-100 mb-3"
        size="lg"
        onClick={() => setShowFilterCard(!showFilterCard)}
        style={{
          backgroundColor: '#0d6efd',
          borderColor: '#0d6efd',
          color: 'white'
        }}
      >
        <i className={`bi ${showFilterCard ? 'bi-chevron-up' : 'bi-chevron-down'} me-2`}></i>
        {t('Filtrar Fábrica', '筛选工厂')}
      </Button>

      {/* Seção de Filtros (Collapsible) */}
      {showFilterCard && (
        <Card className="mb-3">
          <Card.Body>
            {/* Busca por nome da fábrica */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Buscar por nome', '按名称搜索')}</Form.Label>
              <Form.Control
                type="text"
                placeholder={t('Digite o nome da fábrica', '输入工厂名称')}
                value={factorySearchTerm}
                onChange={(e) => setFactorySearchTerm(e.target.value)}
              />
            </Form.Group>

            {/* Filtro por Tags - Organizado por Divisão */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Filtrar por Tags', '按标签筛选')}</Form.Label>
              
              {/* Tags de Região */}
              {availableTags.regiao.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-primary small mb-2">{t('Região', '地区')}</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {availableTags.regiao.map(tag => (
                      <Badge
                        key={tag.id}
                        bg={selectedTags.some(st => st.id === tag.id) ? 'primary' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleTagSelection(tag)}
                        style={{ cursor: 'pointer' }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags de Tipo de Produto */}
              {availableTags.tipoProduto.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-info small mb-2">{t('Tipo de produto', '产品类型')}</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {availableTags.tipoProduto.map(tag => (
                      <Badge
                        key={tag.id}
                        bg={selectedTags.some(st => st.id === tag.id) ? 'info' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleTagSelection(tag)}
                        style={{ cursor: 'pointer' }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags de Material */}
              {availableTags.material.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-success small mb-2">{t('Material', '材料')}</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {availableTags.material.map(tag => (
                      <Badge
                        key={tag.id}
                        bg={selectedTags.some(st => st.id === tag.id) ? 'success' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleTagSelection(tag)}
                        style={{ cursor: 'pointer' }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags de Outros */}
              {availableTags.outros.length > 0 && (
                <div className="mb-3">
                  <h6 className="text-danger small mb-2">{t('Outros', '其他')}</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {availableTags.outros.map(tag => (
                      <Badge
                        key={tag.id}
                        bg={selectedTags.some(st => st.id === tag.id) ? 'danger' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => toggleTagSelection(tag)}
                        style={{ cursor: 'pointer' }}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {(selectedTags.length > 0 || factorySearchTerm.trim()) && (
                <div className="mt-3">
                  <Button 
                    variant="outline-danger" 
                    size="sm"
                    onClick={() => {
                      clearSelectedTags();
                      setFactorySearchTerm('');
                    }}
                  >
                    <i className="bi bi-x-circle me-1"></i>
                    {t('Limpar Filtros', '清除筛选')}
                  </Button>
                </div>
              )}
            </Form.Group>
          </Card.Body>
        </Card>
      )}
      
      {error && (
        <Alert variant="danger" className="mb-3">
          <Alert.Heading>{t('Erro', '错误')}</Alert.Heading>
          {error}
        </Alert>
      )}


      {/* Cards das Fábricas Filtradas */}
      <Row className="g-3">
        {filteredFactories.map((factory) => (
          <Col key={factory.id} xs={12} sm={6} md={4} lg={3}>
            <Card className="h-100 shadow-sm">
              <Card.Body className="d-flex flex-column">
                {/* Nome da Fábrica | Botão Fábrica */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="card-title mb-0 flex-grow-1 me-2" title={factory.name}>
                    {factory.name}
                  </h6>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => handleFactorySelect(factory.id)}
                    title={t('Ver Fábrica', '查看工厂')}
                  >
                    <i className="bi bi-shop"></i>
                  </Button>
                </div>
                
                {/* Tags da Fábrica */}
                <div className="mt-auto">
                  <FactoryTagsDisplay factoryId={factory.id} />
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

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
            
            {/* Mostrar páginas próximas */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const startPage = Math.max(1, currentPage - 2);
              const page = startPage + i;
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

      {/* Modal para cadastrar fábrica */}
      <Modal show={modalVisible} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{t('Nova Fábrica/Loja', '新建工厂/商店')}</Modal.Title>
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
                placeholder={t('Digite o nome da fábrica/loja', '输入工厂/商店名称')}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Nome do Contato', '联系人姓名')}</Form.Label>
              <Form.Control
                type="text"
                name="contactName"
                placeholder={t('Digite o nome do contato', '输入联系人姓名')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Telefone', '电话')}</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                placeholder={t('Digite o telefone', '输入电话号码')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('WeChat', '微信')}</Form.Label>
              <Form.Control
                type="text"
                name="wechat"
                placeholder={t('Digite o WeChat', '输入微信号')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('E-mail', '邮箱')}</Form.Label>
              <Form.Control
                type="email"
                name="email"
                placeholder={t('Digite o e-mail', '输入邮箱地址')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Localização', '位置')}</Form.Label>
              <Form.Control
                type="text"
                name="location"
                placeholder={t('Digite a localização', '输入位置')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Segmento', '行业')}</Form.Label>
              <Form.Control
                type="text"
                name="segment"
                placeholder={t('Digite o segmento de atuação', '输入行业领域')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Descrição', '描述')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                placeholder={t('Digite uma descrição', '输入描述')}
              />
            </Form.Group>

            {/* Campos de Tags */}
            <Row className="mb-3">
              <Col xs={12}>
                <h6 className="text-primary mb-3">{t('Tags da Fábrica', '工厂标签')}</h6>
              </Col>
            </Row>

            {/* Tags Região */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">{t('Tags Região', '地区标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {(factoryTags.regiao || []).map(tag => (
                  <Badge 
                    key={tag.id} 
                    bg="primary" 
                    className="d-flex align-items-center gap-1"
                    style={{ cursor: 'pointer', fontSize: '14px' }}
                    onClick={() => removeTagFromFactory(tag.id, 'regiao')}
                  >
                    {tag.name}
                    <i className="bi bi-x"></i>
                  </Badge>
                ))}
              </div>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder={t('Nova tag', '新标签')}
                  value={newTagInputs.regiao}
                  onChange={(e) => setNewTagInputs(prev => ({ ...prev, regiao: e.target.value }))}
                />
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => addNewTagToFactory('regiao')}
                  disabled={!newTagInputs.regiao.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Região */}
              <div className="mt-2">
                <small className="text-muted d-block mb-2">
                  {t('Tags Globais Disponíveis', '可用全局标签')}
                </small>
                <div className="d-flex flex-wrap gap-2">
                  {availableTags && availableTags.regiao && availableTags.regiao.length > 0 && 
                    availableTags.regiao.map(tag => (
                      <Badge 
                        key={tag.id} 
                        bg="secondary" 
                        className="d-flex align-items-center gap-1"
                        style={{ cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => addAvailableTagToFactory(tag)}
                      >
                        {tag.name}
                        <i className="bi bi-plus"></i>
                      </Badge>
                    ))
                  }
                </div>
              </div>
            </Form.Group>

            {/* Tags Tipo de Produto */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">{t('Tags Tipo de Produto', '产品类型标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {(factoryTags.tipoProduto || []).map(tag => (
                  <Badge 
                    key={tag.id} 
                    bg="info" 
                    className="d-flex align-items-center gap-1"
                    style={{ cursor: 'pointer', fontSize: '14px' }}
                    onClick={() => removeTagFromFactory(tag.id, 'tipoProduto')}
                  >
                    {tag.name}
                    <i className="bi bi-x"></i>
                  </Badge>
                ))}
              </div>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder={t('Nova tag', '新标签')}
                  value={newTagInputs.tipoProduto}
                  onChange={(e) => setNewTagInputs(prev => ({ ...prev, tipoProduto: e.target.value }))}
                />
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={() => addNewTagToFactory('tipoProduto')}
                  disabled={!newTagInputs.tipoProduto.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Tipo de Produto */}
              <div className="mt-2">
                <small className="text-muted d-block mb-2">
                  {t('Tags Globais Disponíveis', '可用全局标签')}
                </small>
                <div className="d-flex flex-wrap gap-2">
                  {availableTags && availableTags.tipoProduto && availableTags.tipoProduto.length > 0 && 
                    availableTags.tipoProduto.map(tag => (
                      <Badge 
                        key={tag.id} 
                        bg="secondary" 
                        className="d-flex align-items-center gap-1"
                        style={{ cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => addAvailableTagToFactory(tag)}
                      >
                        {tag.name}
                        <i className="bi bi-plus"></i>
                      </Badge>
                    ))
                  }
                </div>
              </div>
            </Form.Group>

            {/* Tags Material */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">{t('Tags Material', '材料标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {(factoryTags.material || []).map(tag => (
                  <Badge 
                    key={tag.id} 
                    bg="success" 
                    className="d-flex align-items-center gap-1"
                    style={{ cursor: 'pointer', fontSize: '14px' }}
                    onClick={() => removeTagFromFactory(tag.id, 'material')}
                  >
                    {tag.name}
                    <i className="bi bi-x"></i>
                  </Badge>
                ))}
              </div>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder={t('Nova tag', '新标签')}
                  value={newTagInputs.material}
                  onChange={(e) => setNewTagInputs(prev => ({ ...prev, material: e.target.value }))}
                />
                <Button 
                  variant="outline-success" 
                  size="sm"
                  onClick={() => addNewTagToFactory('material')}
                  disabled={!newTagInputs.material.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Material */}
              <div className="mt-2">
                <small className="text-muted d-block mb-2">
                  {t('Tags Globais Disponíveis', '可用全局标签')}
                </small>
                <div className="d-flex flex-wrap gap-2">
                  {availableTags && availableTags.material && availableTags.material.length > 0 && 
                    availableTags.material.map(tag => (
                      <Badge 
                        key={tag.id} 
                        bg="secondary" 
                        className="d-flex align-items-center gap-1"
                        style={{ cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => addAvailableTagToFactory(tag)}
                      >
                        {tag.name}
                        <i className="bi bi-plus"></i>
                      </Badge>
                    ))
                  }
                </div>
              </div>
            </Form.Group>

            {/* Tags Outros */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">{t('Tags Outros', '其他标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {(factoryTags.outros || []).map(tag => (
                  <Badge 
                    key={tag.id} 
                    bg="danger" 
                    className="d-flex align-items-center gap-1"
                    style={{ cursor: 'pointer', fontSize: '14px' }}
                    onClick={() => removeTagFromFactory(tag.id, 'outros')}
                  >
                    {tag.name}
                    <i className="bi bi-x"></i>
                  </Badge>
                ))}
              </div>
              <div className="d-flex gap-2">
                <Form.Control
                  type="text"
                  placeholder={t('Nova tag', '新标签')}
                  value={newTagInputs.outros}
                  onChange={(e) => setNewTagInputs(prev => ({ ...prev, outros: e.target.value }))}
                />
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => addNewTagToFactory('outros')}
                  disabled={!newTagInputs.outros.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Outros */}
              <div className="mt-2">
                <small className="text-muted d-block mb-2">
                  {t('Tags Globais Disponíveis', '可用全局标签')}
                </small>
                <div className="d-flex flex-wrap gap-2">
                  {availableTags && availableTags.outros && availableTags.outros.length > 0 && 
                    availableTags.outros.map(tag => (
                      <Badge 
                        key={tag.id} 
                        bg="secondary" 
                        className="d-flex align-items-center gap-1"
                        style={{ cursor: 'pointer', fontSize: '12px' }}
                        onClick={() => addAvailableTagToFactory(tag)}
                      >
                        {tag.name}
                        <i className="bi bi-plus"></i>
                      </Badge>
                    ))
                  }
                </div>
              </div>
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
                      console.log('📤 Iniciando upload da imagem principal...', {
                        fileName: file.name,
                        fileSize: file.size,
                        modalVisible,
                        uploadingImages
                      });
                      setUploadingImages(prev => ({ ...prev, image1: true }));
                      const imageUrl = await imageService.uploadFile(file);
                      console.log('✅ Imagem principal enviada com sucesso:', imageUrl);
                      setImageUrls(prev => ({ ...prev, image1: imageUrl }));
                    } catch (error) {
                      console.error('❌ Erro no upload da imagem:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    } finally {
                      console.log('🏁 Finalizando upload da imagem principal...');
                      setUploadingImages(prev => ({ ...prev, image1: false }));
                    }
                  }
                }}
              />
              <Form.Control
                type="hidden"
                name="imageUrl1"
                value={imageUrls.image1}
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
                      console.log('📤 Iniciando upload da imagem secundária...', {
                        fileName: file.name,
                        fileSize: file.size,
                        modalVisible,
                        uploadingImages
                      });
                      setUploadingImages(prev => ({ ...prev, image2: true }));
                      const imageUrl = await imageService.uploadFile(file);
                      console.log('✅ Imagem secundária enviada com sucesso:', imageUrl);
                      setImageUrls(prev => ({ ...prev, image2: imageUrl }));
                    } catch (error) {
                      console.error('❌ Erro no upload da imagem secundária:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    } finally {
                      console.log('🏁 Finalizando upload da imagem secundária...');
                      setUploadingImages(prev => ({ ...prev, image2: false }));
                    }
                  }
                }}
              />
              <Form.Control
                type="hidden"
                name="imageUrl2"
                value={imageUrls.image2}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose} style={{ fontSize: '18px' }}>
              {t('Cancelar', '取消')}
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={submitting || uploadingImages.image1 || uploadingImages.image2}
              style={{ fontSize: '18px' }}
            >
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Salvando...', '保存中...')}
                </>
              ) : uploadingImages.image1 || uploadingImages.image2 ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Enviando imagens...', '上传图片中...')}
                </>
              ) : (
                t('Criar', '创建')
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

export default Dashboard;
