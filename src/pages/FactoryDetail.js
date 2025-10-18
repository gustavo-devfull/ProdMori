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
  Badge
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import factoryServiceAPI from '../services/factoryServiceAPI';
import productServiceAPI from '../services/productServiceAPI';
import imageService from '../services/imageService';
import tagService from '../services/tagService';
import CustomImage from '../components/CustomImage';
import AudioRecorder from '../components/AudioRecorder';
import { useLanguage } from '../contexts/LanguageContext';
import * as XLSX from 'xlsx';

const FactoryDetail = () => {
  const { factoryId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // Detectar se é mobile
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   window.innerWidth <= 768;
  
  const [factory, setFactory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [factoryEditModalVisible, setFactoryEditModalVisible] = useState(false);
  const [factorySubmitting, setFactorySubmitting] = useState(false);
  const [factoryTags, setFactoryTags] = useState({
    regiao: [],
    material: [],
    outros: [],
    tipoProduto: []
  });
  const [factoryNewTagInputs, setFactoryNewTagInputs] = useState({
    regiao: '',
    material: '',
    outros: '',
    tipoProduto: ''
  });
  const [globalTags, setGlobalTags] = useState({
    regiao: [],
    material: [],
    outros: [],
    tipoProduto: []
  });
  const [factoryDataExpanded, setFactoryDataExpanded] = useState(false);
  const [uploadingImages, setUploadingImages] = useState({ image1: false, image2: false });
  const [imageUrls, setImageUrls] = useState({ image1: '', image2: '' });
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);

  // Função para limpeza agressiva de cache e refresh forçado no mobile
  const forceRefreshIfMobile = () => {
    console.log('🔍 forceRefreshIfMobile chamada - isMobile:', isMobile);
    console.log('🔍 navigator.userAgent:', navigator.userAgent);
    console.log('🔍 window.innerWidth:', window.innerWidth);
    
    // Detectar mobile de forma mais específica
    const isActuallyMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isActuallyMobile) {
      console.log('📱 Mobile detectado - Forçando refresh completo da página');
      
      // Limpeza agressiva de cache
      try {
        localStorage.clear();
        sessionStorage.clear();
        console.log('📱 Cache completamente limpo no mobile');
      } catch (e) {
        console.warn('Erro ao limpar cache:', e);
      }
      
      // Refresh forçado da página
      setTimeout(() => {
        console.log('📱 Executando window.location.reload(true)');
        window.location.reload(true);
      }, 500);
      
      return true; // Indica que foi feito refresh
    }
    console.log('💻 Desktop detectado - Não fazendo refresh');
    return false; // Não é mobile, não fez refresh
  };

  const loadFactoryData = useCallback(async () => {
    try {
      console.log('🔄 Iniciando loadFactoryData...');
      setLoading(true);
      
      // Carregar dados da fábrica
      console.log('📋 Carregando dados da fábrica...');
      const factoryData = await factoryServiceAPI.getFactoryById(factoryId);
      if (!factoryData) {
        console.error('❌ Fábrica não encontrada');
        setError(t('Fábrica não encontrada', '工厂未找到'));
        return;
      }
      
      console.log('✅ Dados da fábrica carregados:', factoryData);
      setFactory(factoryData);
      
      // Carregar produtos da fábrica
      console.log('📦 Carregando produtos da fábrica...');
      const productsData = await factoryServiceAPI.getProductsByFactory(factoryId);
      console.log('📦 Produtos brutos carregados:', productsData);
      
      // Ordenar produtos pelos mais recentes primeiro
      const sortedProducts = productsData.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA; // Ordem decrescente (mais recente primeiro)
      });
      
      console.log('📦 Produtos ordenados:', sortedProducts);
      setProducts(sortedProducts);
      
      // Carregar tags da fábrica
      console.log('🏷️ Carregando tags da fábrica...');
      try {
        // Forçar sincronização completa para garantir dados atualizados
        await tagService.forceSyncFromFirebase(factoryId);
        
        const factoryTagsData = await tagService.getFactoryTagsWithAssociations(factoryId);
        console.log('loadFactoryData - Tags carregadas:', factoryTagsData);
        
        // Garantir que a estrutura está correta
        const safeTags = {
          regiao: Array.isArray(factoryTagsData?.regiao) ? factoryTagsData.regiao : [],
          material: Array.isArray(factoryTagsData?.material) ? factoryTagsData.material : [],
          outros: Array.isArray(factoryTagsData?.outros) ? factoryTagsData.outros : [],
          tipoProduto: Array.isArray(factoryTagsData?.tipoProduto) ? factoryTagsData.tipoProduto : []
        };
        
        setFactoryTags(safeTags);
        console.log('loadFactoryData - Tags definidas no estado:', safeTags);
      } catch (error) {
        console.error('Erro ao carregar tags da fábrica:', error);
        // Fallback para localStorage
        const savedTags = localStorage.getItem(`tags_${factoryId}`);
        if (savedTags) {
          const parsedTags = JSON.parse(savedTags);
          const safeTags = {
            regiao: Array.isArray(parsedTags?.regiao) ? parsedTags.regiao : [],
            material: Array.isArray(parsedTags?.material) ? parsedTags.material : [],
            outros: Array.isArray(parsedTags?.outros) ? parsedTags.outros : [],
            tipoProduto: Array.isArray(parsedTags?.tipoProduto) ? parsedTags.tipoProduto : []
          };
          setFactoryTags(safeTags);
          console.log('loadFactoryData - Fallback localStorage tags:', safeTags);
        } else {
          setFactoryTags({ regiao: [], material: [], outros: [], tipoProduto: [] });
          console.log('loadFactoryData - No saved tags, using empty structure');
        }
      }
      
      setError(null);
    } catch (err) {
      setError(t('Erro ao carregar dados da fábrica', '加载工厂数据时出错'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [factoryId, t]);

  useEffect(() => {
    loadFactoryData();
  }, [loadFactoryData]);

  // Monitorar mudanças no estado factoryTags
  useEffect(() => {
    console.log('=== FACTORY TAGS STATE CHANGED ===');
    console.log('Current factoryTags:', factoryTags);
    console.log('tipoProduto tags:', factoryTags.tipoProduto);
    console.log('tipoProduto length:', factoryTags.tipoProduto?.length);
  }, [factoryTags]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData.entries());
    
    try {
      setSubmitting(true);
      
      // Usar a URL da imagem do estado se disponível
      const finalValues = {
        ...values,
        imageUrl: imageUrl || values.imageUrl,
        factoryId: factoryId,
        unit: 'PC', // Valor padrão conforme solicitado
        audioUrl: currentAudioUrl || values.audioUrl // Incluir áudio atual
      };
      
      console.log('=== HANDLE SUBMIT ===');
      console.log('Current audioUrl:', currentAudioUrl);
      console.log('Values audioUrl:', values.audioUrl);
      console.log('Final audioUrl:', finalValues.audioUrl);
      console.log('Final values:', finalValues);
      
      if (editingProduct) {
        await productServiceAPI.updateProduct(editingProduct.id, finalValues);
        setModalVisible(false);
        setEditingProduct(null);
      } else {
        await productServiceAPI.createProduct(finalValues);
        setModalVisible(false);
        setEditingProduct(null);
      }
      
      // Verificar se é mobile e forçar refresh
      console.log('🔄 Verificando se deve fazer refresh após operação...');
      if (forceRefreshIfMobile()) {
        console.log('📱 Refresh foi executado, retornando...');
        return; // Refresh foi feito, não precisa continuar
      }
      console.log('💻 Não é mobile ou refresh não foi necessário, continuando...');
      
      setImageUrl('');
      await loadFactoryData();
    } catch (err) {
      setError(t('Erro ao salvar produto', '保存产品时出错'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleModalClose = () => {
    console.log('=== HANDLE MODAL CLOSE ===');
    console.log('Current modalVisible:', modalVisible);
    console.log('Current editingProduct:', editingProduct);
    
    setModalVisible(false);
    setEditingProduct(null);
    setError(null);
    setImageUrl('');
    setCurrentAudioUrl('');
    setUploadingImage(false);
    
    console.log('Modal close states updated');
  };

  const handlePreview = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  const exportFactoryToExcel = () => {
    if (!products || products.length === 0) {
      alert(t('Nenhum produto para exportar', '没有产品可导出'));
      return;
    }

    // Definir os cabeçalhos das colunas
    const headers = [
      'REF',
      'DESCRIPTION',
      'NAME',
      'REMARK',
      'OBS',
      'NCM',
      'English Description',
      'CTNS',
      'UNIT/CTN',
      'QTY',
      'U.PRICE',
      'UNIT',
      'AMOUNT',
      'L',
      'W',
      'H',
      'CBM',
      'CBM TOTAL',
      'G.W',
      'T.G.W',
      'N.W',
      'T.N.W',
      'Peso Unitário(g)',
      'Link da Foto'
    ];

    // Preparar os dados dos produtos
    const excelData = products.map(product => {
      // Função auxiliar para converter valores para número ou retornar 0 se vazio
      const toNumber = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
      };

      // Calcular campos derivados
      // CTNS é um campo separado, se não existir, usar 1 como padrão
      const ctns = toNumber(product.ctns) || 1;
      const unitCtn = toNumber(product.unitCtn || product.unitCtns);
      const qty = ctns * unitCtn;
      const uPrice = toNumber(product.uPrice);
      const amount = qty * uPrice;
      const length = toNumber(product.length || product.l);
      const width = toNumber(product.width || product.w);
      const height = toNumber(product.height || product.h);
      const cbm = (length * width * height) / 1000000;
      const cbmTotal = ctns * cbm;
      const gW = toNumber(product.gW);
      const tGW = gW * ctns;
      const unitWeight = toNumber(product.unitWeight);
      const nW = unitWeight * unitCtn;
      const tNW = nW * ctns;

      return [
        product.ref || '',
        product.description || '',
        product.name || '',
        product.remark || '',
        product.obs || '',
        product.ncm || '',
        product.englishDescription || '',
        ctns,
        unitCtn,
        qty,
        uPrice,
        product.unit || '',
        amount,
        length,
        width,
        height,
        cbm,
        cbmTotal,
        gW,
        tGW,
        nW,
        tNW,
        unitWeight,
        product.imageUrl || ''
      ];
    });

    // Criar o workbook
    const wb = XLSX.utils.book_new();
    
    // Criar a planilha com cabeçalhos e dados
    const wsData = [headers, ...excelData];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Adicionar a planilha ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
    
    // Gerar o nome do arquivo
    const fileName = `${factory.name || 'Factory'}_Produtos_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Fazer o download
    XLSX.writeFile(wb, fileName);
  };

  const handleDeleteProduct = async (productId) => {
    console.log('=== HANDLE DELETE PRODUCT ===');
    console.log('Product ID:', productId);
    console.log('Current editingProduct:', editingProduct);
    console.log('Current modalVisible:', modalVisible);
    console.log('Current submitting:', submitting);
    
    if (!window.confirm(t('Tem certeza que deseja excluir este produto?', '确定要删除这个产品吗？'))) {
      console.log('User cancelled deletion');
      return;
    }

    try {
      console.log('Starting product deletion...');
      setSubmitting(true);
      
      console.log('Calling productServiceAPI.deleteProduct...');
      await productServiceAPI.deleteProduct(productId);
      console.log('Product deleted successfully');
      
      // Verificar se é mobile e forçar refresh
      console.log('🔄 Verificando se deve fazer refresh após operação...');
      if (forceRefreshIfMobile()) {
        console.log('📱 Refresh foi executado, retornando...');
        return; // Refresh foi feito, não precisa continuar
      }
      console.log('💻 Não é mobile ou refresh não foi necessário, continuando...');
      
      console.log('Reloading factory data...');
      await loadFactoryData();
      console.log('Factory data reloaded');
      
      setError(null);
      
      // Fechar modal imediatamente após sucesso
      console.log('Force closing modal immediately...');
      setModalVisible(false);
      setEditingProduct(null);
      setSubmitting(false);
      
      console.log('Modal should be closed now');
      
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(t('Erro ao excluir produto', '删除产品时出错'));
      
      // Fechar modal mesmo em caso de erro
      console.log('Closing modal due to error...');
      setModalVisible(false);
      setEditingProduct(null);
      setSubmitting(false);
    }
  };


  // Funções para gerenciar edição da fábrica
  const handleEditFactory = async () => {
    setFactoryEditModalVisible(true);
    // Inicializar URLs das imagens para edição
    setImageUrls({
      image1: factory.imageUrl1 || '',
      image2: factory.imageUrl2 || ''
    });
    
    // Carregar tags da fábrica (mesmo método da página de fábricas)
    try {
      const factoryTagsData = await tagService.getFactoryTagsWithAssociations(factoryId);
      console.log('handleEditFactory - Tags carregadas:', factoryTagsData);
      
      // Garantir que a estrutura está correta
      const safeTags = {
        regiao: Array.isArray(factoryTagsData?.regiao) ? factoryTagsData.regiao : [],
        material: Array.isArray(factoryTagsData?.material) ? factoryTagsData.material : [],
        outros: Array.isArray(factoryTagsData?.outros) ? factoryTagsData.outros : [],
        tipoProduto: Array.isArray(factoryTagsData?.tipoProduto) ? factoryTagsData.tipoProduto : []
      };
      
      setFactoryTags(safeTags);
      console.log('handleEditFactory - Tags definidas no estado:', safeTags);
    } catch (error) {
      console.error('Erro ao carregar tags da fábrica:', error);
      // Fallback para localStorage
      const savedTags = localStorage.getItem(`tags_${factoryId}`);
      if (savedTags) {
        const parsedTags = JSON.parse(savedTags);
        // Garantir que tipoProduto existe
        const safeTags = {
          regiao: Array.isArray(parsedTags?.regiao) ? parsedTags.regiao : [],
          material: Array.isArray(parsedTags?.material) ? parsedTags.material : [],
          outros: Array.isArray(parsedTags?.outros) ? parsedTags.outros : [],
          tipoProduto: Array.isArray(parsedTags?.tipoProduto) ? parsedTags.tipoProduto : []
        };
        setFactoryTags(safeTags);
        console.log('handleEditFactory - Fallback localStorage tags:', safeTags);
      } else {
        setFactoryTags({ regiao: [], material: [], outros: [], tipoProduto: [] });
        console.log('handleEditFactory - No saved tags, using empty structure');
      }
    }
    
    // Recarregar tags globais
    console.log('=== CARREGANDO TAGS GLOBAIS ===');
    try {
      const globalTagsData = await tagService.getAllTagsFromFirebase();
      console.log('Tags globais carregadas:', globalTagsData);
      console.log('Tags globais - tipoProduto:', globalTagsData.tipoProduto);
      console.log('Tags globais - tipoProduto length:', globalTagsData.tipoProduto?.length);
      setGlobalTags(globalTagsData);
      
      // Não usar cache do Dashboard - usar apenas dados do Firebase
      console.log('Usando apenas dados do Firebase (sem cache)');
    } catch (error) {
      console.error('Erro ao carregar tags globais do Firebase:', error);
      // Em caso de erro, usar estrutura vazia (não usar localStorage)
      setGlobalTags({
        regiao: [],
        material: [],
        outros: [],
        tipoProduto: []
      });
    }
  };

  const handleFactoryModalClose = () => {
    setFactoryEditModalVisible(false);
    setError(null);
    // Limpar estado das imagens
    setImageUrls({ image1: '', image2: '' });
    setUploadingImages({ image1: false, image2: false });
    resetFactoryTags();
    setShowAdditionalFields(false);
  };

  const handleFactorySubmit = async (values) => {
    try {
      setFactorySubmitting(true);
      setError(null); // Limpar erros anteriores
      
      // Verificar se há uploads em andamento
      if (uploadingImages.image1 || uploadingImages.image2) {
        console.log('Aguardando upload das imagens...');
        setError(t('Aguarde o upload das imagens terminar', '等待图片上传完成'));
        setFactorySubmitting(false); // Resetar estado de submitting
        return;
      }
      
      console.log('=== UPDATING FACTORY ===');
      console.log('Factory ID:', factoryId);
      console.log('Values:', values);
      console.log('Image URLs:', imageUrls);
      
      // Usar as URLs das imagens do estado do React
      const finalValues = {
        ...values,
        imageUrl1: imageUrls.image1 || values.imageUrl1,
        imageUrl2: imageUrls.image2 || values.imageUrl2
      };
      
      console.log('Final values:', finalValues);
      
      await factoryServiceAPI.updateFactory(factoryId, finalValues);
      console.log('Factory updated successfully');
      
      // Gerenciar associações de tags da fábrica
      console.log('Managing factory tags:', factoryTags);
      console.log('Factory tags tipoProduto:', factoryTags.tipoProduto);
      console.log('Factory tags tipoProduto length:', factoryTags.tipoProduto?.length);
      console.log('Factory ID:', factoryId);
      
      // Carregar tags atuais da fábrica para comparação
      const currentFactoryTags = await tagService.getFactoryTagsWithAssociations(factoryId);
      console.log('Current factory tags for comparison:', currentFactoryTags);
      
      // Processar cada divisão de tags
      Object.keys(factoryTags).forEach(async (division) => {
        console.log(`Processing division: ${division}`);
        console.log(`New tags in ${division}:`, factoryTags[division]);
        console.log(`Current tags in ${division}:`, currentFactoryTags[division] || []);
        
        const newTags = factoryTags[division] || [];
        const currentTags = currentFactoryTags[division] || [];
        
        // Encontrar tags que foram removidas (estavam associadas mas não estão mais)
        const removedTags = currentTags.filter(currentTag => 
          !newTags.some(newTag => newTag.id === currentTag.id)
        );
        
        // Encontrar tags que foram adicionadas (não estavam associadas mas estão agora)
        const addedTags = newTags.filter(newTag => 
          !currentTags.some(currentTag => currentTag.id === newTag.id)
        );
        
        console.log(`Removed tags in ${division}:`, removedTags);
        console.log(`Added tags in ${division}:`, addedTags);
        
        // Remover associações das tags desmarcadas
        for (const removedTag of removedTags) {
          console.log(`Removing association for tag: ${removedTag.name} (${removedTag.id}) from factory ${factoryId}`);
          await tagService.removeTagAssociation(removedTag, factoryId);
        }
        
        // Adicionar associações das tags marcadas
        for (const addedTag of addedTags) {
          console.log(`Adding association for tag: ${addedTag.name} (${addedTag.id}) to factory ${factoryId}`);
          await tagService.createTagAssociation(addedTag, factoryId);
        }
      });
      
      // Sincronizar tags globais após salvar
      tagService.syncGlobalTags();
      console.log('Factory tags saved and synced');
      
      setFactoryEditModalVisible(false);
      
      // Verificar se é mobile e forçar refresh
      console.log('🔄 Verificando se deve fazer refresh após operação...');
      if (forceRefreshIfMobile()) {
        console.log('📱 Refresh foi executado, retornando...');
        return; // Refresh foi feito, não precisa continuar
      }
      console.log('💻 Não é mobile ou refresh não foi necessário, continuando...');
      
      await loadFactoryData();
      console.log('Factory data reloaded');
      
    } catch (err) {
      console.error('Error updating factory:', err);
      setError(t('Erro ao salvar fábrica', '保存工厂时出错'));
    } finally {
      setFactorySubmitting(false);
      console.log('Factory submitting state reset');
    }
  };

  const handleDeleteFactory = async () => {
    if (!factoryId) return;
    
    const confirmMessage = t(
      'Tem certeza que deseja excluir esta fábrica? Esta ação não pode ser desfeita.',
      '确定要删除这个工厂吗？此操作无法撤销。'
    );
    
    if (window.confirm(confirmMessage)) {
      try {
        await factoryServiceAPI.deleteFactory(factoryId);
        console.log('Fábrica excluída com sucesso');
        
        // Disparar evento customizado para notificar o Dashboard imediatamente
        window.dispatchEvent(new CustomEvent('factoryDeleted', { 
          detail: { factoryId: factoryId } 
        }));
        
        // Verificar se é mobile e forçar refresh
        console.log('🔄 Verificando se deve fazer refresh após exclusão da fábrica...');
        if (forceRefreshIfMobile()) {
          console.log('📱 Refresh foi executado, redirecionando após refresh...');
          // No mobile, o refresh vai recarregar a página, então vamos redirecionar após o refresh
          setTimeout(() => {
            console.log('🏠 Redirecionando para Dashboard via window.location...');
            window.location.href = '/dashboard';
          }, 1000);
          return; // Refresh foi feito, não precisa continuar
        }
        console.log('💻 Não é mobile ou refresh não foi necessário, redirecionando...');
        
        // Redirecionar para o Dashboard
        console.log('🏠 Redirecionando para o Dashboard via navigate...');
        navigate('/dashboard');
        
        // Fallback: se navigate não funcionar, usar window.location
        setTimeout(() => {
          console.log('🏠 Fallback: Redirecionando via window.location...');
          window.location.href = '/dashboard';
        }, 100);
      } catch (error) {
        console.error('Erro ao excluir fábrica:', error);
        alert(t('Erro ao excluir fábrica', '删除工厂时出错'));
      }
    }
  };

  // Funções para gerenciar tags da fábrica
  const addTagToFactory = (tag, division) => {
    console.log('=== ADD TAG TO FACTORY ===');
    console.log('Tag:', tag);
    console.log('Division:', division);
    console.log('Current factoryTags before:', factoryTags);
    
    setFactoryTags(prev => {
      console.log('Previous state:', prev);
      console.log('Division exists:', !!prev[division]);
      console.log('Division is array:', Array.isArray(prev[division]));
      
      // Verificar se a divisão existe e é um array
      if (!prev[division] || !Array.isArray(prev[division])) {
        console.log('Divisão não existe ou não é array:', division);
        console.log('Current prev[division]:', prev[division]);
        return prev;
      }
      
      // Verificar se a tag já existe na divisão
      const existingTag = prev[division].find(t => t.id === tag.id || t.name === tag.name);
      if (existingTag) {
        console.log('Tag já existe na fábrica:', tag.name);
        return prev; // Não adicionar se já existe
      }
      
      console.log('Adicionando tag à fábrica:', tag.name, 'na divisão:', division);
      const newState = {
        ...prev,
        [division]: [...prev[division], tag]
      };
      console.log('New state after adding tag:', newState);
      return newState;
    });
  };

  const removeTagFromFactory = (tagId, division) => {
    console.log('Removendo tag da fábrica:', tagId, 'da divisão:', division);
    setFactoryTags(prev => ({
      ...prev,
      [division]: prev[division].filter(tag => tag.id !== tagId)
    }));
  };

  const addNewTagToFactory = async (division) => {
    const tagName = factoryNewTagInputs[division].trim();
    if (!tagName) return;

    console.log('=== ADD NEW TAG TO FACTORY ===');
    console.log('Tag:', tagName);
    console.log('Division:', division);
    console.log('Current factory tags:', factoryTags);

    const newTag = {
      id: Date.now().toString(),
      name: tagName,
      division: division,
      createdAt: new Date(),
      updatedAt: new Date(),
      isNewTag: true // Marcar como tag nova
    };

    // Criar a tag globalmente primeiro
    try {
      const result = await tagService.addTag(newTag);
      if (result.success) {
        console.log('Tag criada globalmente:', result);
        
        // Atualizar tags globais disponíveis
        const globalTagsData = await tagService.getAllTagsFromFirebase();
        setGlobalTags(globalTagsData);
      } else {
        console.warn('Tag já existe globalmente:', result.message);
      }
    } catch (error) {
      console.error('Erro ao criar tag globalmente:', error);
    }

    // Adicionar à fábrica atual (sempre, mesmo se já existir globalmente)
    addTagToFactory(newTag, division);

    // Limpar input
    setFactoryNewTagInputs(prev => ({
      ...prev,
      [division]: ''
    }));
  };

  const addGlobalTagToFactory = (tag, division) => {
    console.log('=== ADD GLOBAL TAG TO FACTORY ===');
    console.log('Tag:', tag);
    console.log('Division:', division);
    console.log('Current factory tags:', factoryTags[division]);
    
    // Verificar se a divisão existe e é um array
    if (!factoryTags[division] || !Array.isArray(factoryTags[division])) {
      console.log('Divisão não existe ou não é array:', division);
      return;
    }
    
    // Verificar se a tag já existe na fábrica (por ID ou nome)
    const existingTag = factoryTags[division].find(t => t.id === tag.id || t.name === tag.name);
    if (existingTag) {
      console.log('Tag já existe na fábrica:', tag.name);
      return;
    }

    console.log('Adicionando tag global à fábrica:', tag.name);
    // Marcar como tag global existente (não nova)
    const tagToAdd = {
      ...tag,
      isNewTag: false
    };
    // Adicionar a tag à fábrica
    addTagToFactory(tagToAdd, division);
  };

  const resetFactoryTags = () => {
    setFactoryTags({
      regiao: [],
      material: [],
      outros: [],
      tipoProduto: []
    });
    setFactoryNewTagInputs({
      regiao: '',
      material: '',
      outros: '',
      tipoProduto: ''
    });
  };


  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="lg" />
      </div>
    );
  }

  if (!factory) {
    return (
      <div className="text-center py-5">
        <Alert variant="danger">
          <Alert.Heading>{t('Erro', '错误')}</Alert.Heading>
          {error || t('Fábrica não encontrada', '工厂未找到')}
        </Alert>
        <Button variant="primary" onClick={() => navigate('/')}>
          {t('Voltar ao Dashboard', '返回仪表板')}
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Card azul com nome da fábrica e botões */}
      <Card className="bg-primary text-white mb-3">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div 
              className="d-flex align-items-center cursor-pointer"
              onClick={() => setFactoryDataExpanded(!factoryDataExpanded)}
              style={{ cursor: 'pointer' }}
            >
              <h4 className="mb-0 text-white me-2">{factory.name}</h4>
              <i className={`bi ${factoryDataExpanded ? 'bi-chevron-up' : 'bi-chevron-down'} text-white`}></i>
            </div>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-light"
                size="sm"
                onClick={handleEditFactory}
                title={t('Editar fábrica', '编辑工厂')}
              >
                <i className="bi bi-pencil"></i>
              </Button>
              <Button 
                variant="outline-light"
                size="sm"
                onClick={() => navigate('/')}
              >
                {t('Fechar', '关闭')}
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Seção expansível com dados da fábrica */}
      {factoryDataExpanded && (
        <Card className="mb-3">
          <Card.Body>
            <h5 className="mb-3">{t('Dados da Fábrica', '工厂数据')}</h5>
            
            <Row>
              <Col md={6}>
                <div className="mb-3 d-flex align-items-center">
                  <div style={{ fontSize: '12px', color: '#6c757d', minWidth: '80px', marginRight: '10px' }}>
                    {t('Nome', '名称')}:
                  </div>
                  <Form.Control
                    type="text"
                    value={factory.name || ''}
                    placeholder={t('Nome', '名称')}
                    readOnly
                    className="border-0 bg-transparent p-0 flex-grow-1"
                    style={{ boxShadow: 'none', fontSize: '14px' }}
                  />
                </div>
                <div className="mb-3 d-flex align-items-center">
                  <div style={{ fontSize: '12px', color: '#6c757d', minWidth: '80px', marginRight: '10px' }}>
                    {t('Contato', '联系人')}:
                  </div>
                  <Form.Control
                    type="text"
                    value={factory.contactName || ''}
                    placeholder={t('Contato', '联系人')}
                    readOnly
                    className="border-0 bg-transparent p-0 flex-grow-1"
                    style={{ boxShadow: 'none', fontSize: '14px' }}
                  />
                </div>
                <div className="mb-3 d-flex align-items-center">
                  <div style={{ fontSize: '12px', color: '#6c757d', minWidth: '80px', marginRight: '10px' }}>
                    {t('Telefone', '电话')}:
                  </div>
                  <Form.Control
                    type="text"
                    value={factory.phone || ''}
                    placeholder={t('Telefone', '电话')}
                    readOnly
                    className="border-0 bg-transparent p-0 flex-grow-1"
                    style={{ boxShadow: 'none', fontSize: '14px' }}
                  />
                </div>
                <div className="mb-3 d-flex align-items-center">
                  <div style={{ fontSize: '12px', color: '#6c757d', minWidth: '80px', marginRight: '10px' }}>
                    {t('WeChat', '微信')}:
                  </div>
                  <Form.Control
                    type="text"
                    value={factory.wechat || ''}
                    placeholder={t('WeChat', '微信')}
                    readOnly
                    className="border-0 bg-transparent p-0 flex-grow-1"
                    style={{ boxShadow: 'none', fontSize: '14px' }}
                  />
                </div>
                <div className="mb-3 d-flex align-items-center">
                  <div style={{ fontSize: '12px', color: '#6c757d', minWidth: '80px', marginRight: '10px' }}>
                    {t('Email', '邮箱')}:
                  </div>
                  <Form.Control
                    type="text"
                    value={factory.email || ''}
                    placeholder={t('Email', '邮箱')}
                    readOnly
                    className="border-0 bg-transparent p-0 flex-grow-1"
                    style={{ boxShadow: 'none', fontSize: '14px' }}
                  />
                </div>
              </Col>
              <Col md={6}>
                <div className="mb-3 d-flex align-items-center">
                  <div style={{ fontSize: '12px', color: '#6c757d', minWidth: '80px', marginRight: '10px' }}>
                    {t('Localização', '位置')}:
                  </div>
                  <Form.Control
                    type="text"
                    value={factory.location || ''}
                    placeholder={t('Localização', '位置')}
                    readOnly
                    className="border-0 bg-transparent p-0 flex-grow-1"
                    style={{ boxShadow: 'none', fontSize: '14px' }}
                  />
                </div>
                <div className="mb-3 d-flex align-items-center">
                  <div style={{ fontSize: '12px', color: '#6c757d', minWidth: '80px', marginRight: '10px' }}>
                    {t('Segmento', '行业')}:
                  </div>
                  <Form.Control
                    type="text"
                    value={factory.segment || ''}
                    placeholder={t('Segmento', '行业')}
                    readOnly
                    className="border-0 bg-transparent p-0 flex-grow-1"
                    style={{ boxShadow: 'none', fontSize: '14px' }}
                  />
                </div>
              </Col>
            </Row>

            {/* Descrição */}
            {factory.description && (
              <div className="mb-3">
                <strong>{t('Descrição:', '描述:')}</strong>
                <div className="mt-2 p-3 bg-light rounded">
                  {factory.description}
                </div>
              </div>
            )}

            {/* Tags da fábrica */}
            {(factoryTags.regiao.length > 0 || factoryTags.material.length > 0 || factoryTags.outros.length > 0) && (
              <div className="mt-3">
                <strong>{t('Tags:', '标签:')}</strong>
                <div className="mt-2">
                  {factoryTags.regiao.length > 0 && (
                    <div className="mb-2">
                      <small className="text-muted">{t('Região:', '地区:')}</small>
                      <div>
                        {factoryTags.regiao && factoryTags.regiao.map((tag, index) => (
                          <Badge key={index} bg="primary" className="me-1 mb-1">
                            {typeof tag === 'string' ? tag : tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {factoryTags.material.length > 0 && (
                    <div className="mb-2">
                      <small className="text-muted">{t('Material:', '材料:')}</small>
                      <div>
                        {factoryTags.material && factoryTags.material.map((tag, index) => (
                          <Badge key={index} bg="success" className="me-1 mb-1">
                            {typeof tag === 'string' ? tag : tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {factoryTags.outros.length > 0 && (
                    <div className="mb-2">
                      <small className="text-muted">{t('Outros:', '其他:')}</small>
                      <div>
                        {factoryTags.outros && factoryTags.outros.map((tag, index) => (
                          <Badge key={index} bg="danger" className="me-1 mb-1">
                            {typeof tag === 'string' ? tag : tag.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Imagens da fábrica */}
            {(factory.imageUrl1 || factory.imageUrl2) && (
              <div className="mt-3">
                <strong>{t('Imagens:', '图片:')}</strong>
                <div className="mt-2">
                  <Row>
                    {factory.imageUrl1 && (
                      <Col md={6} className="mb-2">
                        <div
                          style={{ 
                            width: '100%', 
                            height: '200px', 
                            cursor: 'pointer',
                            borderRadius: '8px',
                            overflow: 'hidden'
                          }}
                          onClick={() => {
                            setPreviewImage(factory.imageUrl1);
                            setPreviewVisible(true);
                          }}
                        >
                          <CustomImage
                            src={factory.imageUrl1}
                            alt={`${factory.name} - Imagem 1`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            fallback={<div className="bg-light d-flex align-items-center justify-content-center h-100">Imagem 1</div>}
                          />
                        </div>
                      </Col>
                    )}
                    {factory.imageUrl2 && (
                      <Col md={6} className="mb-2">
                        <div
                          style={{ 
                            width: '100%', 
                            height: '200px', 
                            cursor: 'pointer',
                            borderRadius: '8px',
                            overflow: 'hidden'
                          }}
                          onClick={() => {
                            setPreviewImage(factory.imageUrl2);
                            setPreviewVisible(true);
                          }}
                        >
                          <CustomImage
                            src={factory.imageUrl2}
                            alt={`${factory.name} - Imagem 2`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            fallback={<div className="bg-light d-flex align-items-center justify-content-center h-100">Imagem 2</div>}
                          />
                        </div>
                      </Col>
                    )}
                  </Row>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Botão Cadastrar Produto */}
      <Button 
        variant="success" 
        className="w-100 mb-4"
        size="lg"
        onClick={() => navigate(`/product/create/${factoryId}`)}
      >
        <i className="bi bi-plus-circle me-2"></i>
        {t('Cadastrar Produto', '注册产品')}
      </Button>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Card dos Produtos Cadastrados */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">{t('Produtos Cadastrados', '已注册产品')}</h5>
        </Card.Header>
        <Card.Body>
          {/* Listagem dos produtos */}
            {!products || products.length === 0 ? (
              <div className="text-center py-4">
                <i className="bi bi-bag text-muted fs-1"></i>
                <p className="text-muted mt-2">{t('Nenhum produto cadastrado', '没有注册产品')}</p>
              </div>
            ) : (
              <Row className="g-3">
                {products.map((product) => (
                  <Col xs={12} md={6} lg={4} key={product.id}>
                    <Card className="h-100">
                      <Card.Body className="p-3">
                        <Row className="align-items-start">
                          {/* Foto do produto - 50% da largura, 180px de altura */}
                          <Col xs={6}>
                            <div className="d-flex justify-content-center">
                              {product.imageUrl ? (
                                <CustomImage
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="img-fluid rounded"
                                  style={{ 
                                    width: '100%', 
                                    height: '150px', 
                                    objectFit: 'cover',
                                    cursor: 'pointer'
                                  }}
                                  showPreview={true}
                                  onPreview={handlePreview}
                                />
                              ) : (
                                <div 
                                  className="d-flex align-items-center justify-content-center rounded bg-light"
                                  style={{ 
                                    width: '100%', 
                                    height: '150px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handlePreview('')}
                                >
                                  <i className="bi bi-image text-muted fs-2"></i>
                                </div>
                              )}
                            </div>
                          </Col>
                          
                          {/* Informações do produto */}
                          <Col xs={6}>
                            <div className="d-flex flex-column h-100">
                              {/* REF na primeira linha */}
                              <div className="mb-2">
                                <span className="fw-medium">
                                  {product.ref || t('Sem REF', '无REF')}
                                </span>
                              </div>
                              
                              {/* U.PRICE na segunda linha */}
                              <div className="mb-3">
                                <span className="text-primary fw-bold">
                                  ¥ {product.uPrice || t('Sob consulta', '咨询价格')}
                                </span>
                              </div>
                              
                              {/* Botões na terceira linha */}
                              <div className="d-flex gap-2">
                                <Button 
                                  variant="outline-primary" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Edit button clicked from card');
                                    navigate(`/product/create/${factoryId}`, {
                                      state: { editingProduct: product }
                                    });
                                  }}
                                  title={t('Editar produto', '编辑产品')}
                                >
                                  {t('Editar', '编辑')}
                                </Button>
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('Delete button clicked from card, submitting:', submitting);
                                    if (!submitting) {
                                      handleDeleteProduct(product.id);
                                    }
                                  }}
                                  disabled={submitting}
                                  title={t('Excluir produto', '删除产品')}
                                >
                                  {t('Excluir', '删除')}
                                </Button>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
        </Card.Body>
      </Card>

      {/* Botão de Exportação */}
      {products && products.length > 0 && (
        <div className="text-center mb-4">
          <Button 
            variant="success" 
            size="lg"
            onClick={exportFactoryToExcel}
            className="px-4 py-2"
          >
            <i className="bi bi-file-earmark-excel me-2"></i>
            {t('EXPORTAR Fábrica', '导出工厂')}
          </Button>
        </div>
      )}

      {/* Modal para cadastrar produto */}
      <Modal show={modalVisible} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingProduct ? t('Editar Produto', '编辑产品') : t('Cadastrar Produto', '注册产品')}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>

            {/* Nome da Fábrica com Botão Salvar */}
            <Form.Group className="mb-3">
              <Row className="align-items-center">
                <Col xs={8}>
                  <Form.Control
                    type="text"
                    value={factory.name}
                    disabled
                    className="bg-light"
                  />
                </Col>
                <Col xs={4}>
                  <Button 
                    variant="success" 
                    type="submit" 
                    disabled={submitting || uploadingImage}
                    className="w-100 d-flex align-items-center justify-content-center"
                  >
                    {submitting ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        {t('Salvando...', '保存中...')}
                      </>
                    ) : uploadingImage ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        {t('Enviando imagem...', '上传图片中...')}
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-lg me-1"></i>
                        {t('Salvar', '保存')}
                      </>
                    )}
                  </Button>
                </Col>
              </Row>
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
                      setUploadingImage(true);
                      const uploadedImageUrl = await imageService.uploadFile(file);
                      setImageUrl(uploadedImageUrl);
                    } catch (error) {
                      console.error('Erro no upload da imagem:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    } finally {
                      setUploadingImage(false);
                    }
                  }
                }}
              />
              {imageUrl && (
                <div className="mt-2">
                  <CustomImage
                    src={imageUrl}
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
                value={imageUrl}
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

            {/* UNIT/CTN | CBM */}
            <Row className="mb-3">
              <Col xs={6}>
                <Form.Group>
                  <Form.Label>{t('UNIT/CTN', '单位/箱')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="unitCtn"
                    defaultValue={editingProduct?.unitCtn || editingProduct?.unitCtns || ''}
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

            {/* Peso unitário (g) */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Peso unitário (g)', '单位重量(克)')}</Form.Label>
              <Form.Control
                type="number"
                step="0.1"
                name="unitWeight"
                defaultValue={editingProduct?.unitWeight || ''}
                placeholder={t('Peso em gramas', '重量(克)')}
              />
            </Form.Group>

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

            {/* REMARK */}
            <Form.Group className="mb-3">
              <Form.Label>{t('REMARK', '备注')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="remark"
                defaultValue={editingProduct?.remark || ''}
                placeholder={t('Digite observações adicionais', '输入额外备注')}
              />
            </Form.Group>

            {/* Gravação de Áudio */}
            <Form.Group className="mb-3">
              <AudioRecorder 
                onAudioReady={(blob, url) => {
                  console.log('Áudio gravado:', blob, url);
                }}
                onAudioChange={(url) => {
                  console.log('AudioRecorder onAudioChange chamado com URL:', url);
                  setCurrentAudioUrl(url);
                }}
                productId={editingProduct?.id || 'new'}
                initialAudioUrl={editingProduct?.audioUrls?.[0]?.url || editingProduct?.audioUrl}
                disabled={submitting}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose}>
              {t('Cancelar', '取消')}
            </Button>
            <Button 
              variant="success" 
              type="submit" 
              disabled={submitting || uploadingImage}
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
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal para editar fábrica */}
      <Modal show={factoryEditModalVisible} onHide={handleFactoryModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {t('Editar Fábrica/Loja', '编辑工厂/商店')}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.target);
          const values = Object.fromEntries(formData.entries());
          handleFactorySubmit(values);
        }}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>{t('Nome da Fábrica/Loja', '工厂/商店名称')}</Form.Label>
              <Form.Control
                type="text"
                name="name"
                defaultValue={factory?.name || ''}
                placeholder={t('Digite o nome da fábrica/loja', '输入工厂/商店名称')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Nome do Contato', '联系人姓名')}</Form.Label>
              <Form.Control
                type="text"
                name="contactName"
                defaultValue={factory?.contactName || ''}
                placeholder={t('Digite o nome do contato', '输入联系人姓名')}
              />
            </Form.Group>

            {/* Botão para mostrar/ocultar campos adicionais */}
            <div className="d-flex justify-content-center mb-3">
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setShowAdditionalFields(!showAdditionalFields)}
                className="d-flex align-items-center"
              >
                <i className={`bi ${showAdditionalFields ? 'bi-chevron-up' : 'bi-chevron-down'} me-1`}></i>
                {showAdditionalFields ? t('Ocultar campos adicionais', '隐藏额外字段') : t('Mostrar campos adicionais', '显示额外字段')}
              </Button>
            </div>

            {/* Campos adicionais */}
            {showAdditionalFields && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>{t('Telefone', '电话')}</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    defaultValue={factory?.phone || ''}
                    placeholder={t('Digite o telefone', '输入电话号码')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('WeChat', '微信')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="wechat"
                    defaultValue={factory?.wechat || ''}
                    placeholder={t('Digite o WeChat', '输入微信号')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('E-mail', '邮箱')}</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    defaultValue={factory?.email || ''}
                    placeholder={t('Digite o e-mail', '输入邮箱地址')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('Localização', '位置')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="location"
                    defaultValue={factory?.location || ''}
                    placeholder={t('Digite a localização', '输入位置')}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>{t('Segmento', '行业')}</Form.Label>
                  <Form.Control
                    type="text"
                    name="segment"
                    defaultValue={factory?.segment || ''}
                    placeholder={t('Digite o segmento de atuação', '输入行业领域')}
                  />
                </Form.Group>
              </>
            )}

            <Form.Group className="mb-3">
              <Form.Label>{t('Descrição', '描述')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                defaultValue={factory?.description || ''}
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
              <Form.Label>{t('Tags Região', '地区标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {factoryTags.regiao && factoryTags.regiao.map(tag => (
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
                  value={factoryNewTagInputs.regiao}
                  onChange={(e) => setFactoryNewTagInputs(prev => ({ ...prev, regiao: e.target.value }))}
                />
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => addNewTagToFactory('regiao')}
                  disabled={!factoryNewTagInputs.regiao.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Região */}
              <div className="mt-2">
                <small className="text-muted d-block mb-2">{t('Tags Globais Disponíveis', '可用全局标签')}:</small>
                {globalTags && globalTags.regiao && globalTags.regiao.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1">
                    {globalTags.regiao.map(tag => {
                      const isAlreadyAdded = factoryTags.regiao.some(t => t.id === tag.id);
                      return (
                        <Badge 
                          key={tag.id} 
                          bg="secondary" 
                          className="d-flex align-items-center gap-1"
                          style={{ 
                            cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                            opacity: isAlreadyAdded ? 0.5 : 1,
                            fontSize: '14px'
                          }}
                          onClick={() => !isAlreadyAdded && addGlobalTagToFactory(tag, 'regiao')}
                          title={isAlreadyAdded ? t('Já adicionada', '已添加') : t('Clique para adicionar', '点击添加')}
                        >
                          {tag.name}
                          {!isAlreadyAdded && <i className="bi bi-plus"></i>}
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <small className="text-muted">{t('Nenhuma tag global disponível', '没有可用的全局标签')}</small>
                )}
              </div>
            </Form.Group>

            {/* Tags Tipo de Produto */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Tags Tipo de Produto', '产品类型标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {factoryTags.tipoProduto && factoryTags.tipoProduto.map(tag => (
                  <Badge 
                    key={tag.id} 
                    bg="warning" 
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
                  value={factoryNewTagInputs.tipoProduto}
                  onChange={(e) => setFactoryNewTagInputs(prev => ({ ...prev, tipoProduto: e.target.value }))}
                />
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={() => addNewTagToFactory('tipoProduto')}
                  disabled={!factoryNewTagInputs.tipoProduto.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Tipo de Produto */}
              <div className="mt-2">
                <small className="text-muted d-block mb-2">{t('Tags Globais Disponíveis', '可用全局标签')}:</small>
                {globalTags && globalTags.tipoProduto && globalTags.tipoProduto.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1">
                    {globalTags.tipoProduto.map(tag => {
                      const isAlreadyAdded = factoryTags.tipoProduto && factoryTags.tipoProduto.some(t => t.id === tag.id);
                      return (
                        <Badge 
                          key={tag.id} 
                          bg="secondary" 
                          className="d-flex align-items-center gap-1"
                          style={{ 
                            cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                            opacity: isAlreadyAdded ? 0.5 : 1,
                            fontSize: '14px'
                          }}
                          onClick={() => !isAlreadyAdded && addGlobalTagToFactory(tag, 'tipoProduto')}
                          title={isAlreadyAdded ? t('Já adicionada', '已添加') : t('Clique para adicionar', '点击添加')}
                        >
                          {tag.name}
                          {!isAlreadyAdded && <i className="bi bi-plus"></i>}
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <small className="text-muted">{t('Nenhuma tag global disponível', '没有可用的全局标签')}</small>
                )}
              </div>
            </Form.Group>

            {/* Tags Material */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Tags Material', '材料标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {factoryTags.material && factoryTags.material.map(tag => (
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
                  value={factoryNewTagInputs.material}
                  onChange={(e) => setFactoryNewTagInputs(prev => ({ ...prev, material: e.target.value }))}
                />
                <Button 
                  variant="outline-success" 
                  size="sm"
                  onClick={() => addNewTagToFactory('material')}
                  disabled={!factoryNewTagInputs.material.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Material */}
              <div className="mt-2">
                <small className="text-muted d-block mb-2">{t('Tags Globais Disponíveis', '可用全局标签')}:</small>
                {globalTags && globalTags.material && globalTags.material.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1">
                    {globalTags.material.map(tag => {
                      const isAlreadyAdded = factoryTags.material.some(t => t.id === tag.id);
                      return (
                        <Badge 
                          key={tag.id} 
                          bg="secondary" 
                          className="d-flex align-items-center gap-1"
                          style={{ 
                            cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                            opacity: isAlreadyAdded ? 0.5 : 1,
                            fontSize: '14px'
                          }}
                          onClick={() => !isAlreadyAdded && addGlobalTagToFactory(tag, 'material')}
                          title={isAlreadyAdded ? t('Já adicionada', '已添加') : t('Clique para adicionar', '点击添加')}
                        >
                          {tag.name}
                          {!isAlreadyAdded && <i className="bi bi-plus"></i>}
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <small className="text-muted">{t('Nenhuma tag global disponível', '没有可用的全局标签')}</small>
                )}
              </div>
            </Form.Group>

            {/* Tags Outros */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Tags Outros', '其他标签')}</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {factoryTags.outros && factoryTags.outros.map(tag => (
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
                  value={factoryNewTagInputs.outros}
                  onChange={(e) => setFactoryNewTagInputs(prev => ({ ...prev, outros: e.target.value }))}
                />
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => addNewTagToFactory('outros')}
                  disabled={!factoryNewTagInputs.outros.trim()}
                >
                  <i className="bi bi-plus"></i>
                </Button>
              </div>
              
              {/* Tags Globais Outros */}
              <div className="mt-2">
                <small className="text-muted d-block mb-2">{t('Tags Globais Disponíveis', '可用全局标签')}:</small>
                {globalTags && globalTags.outros && globalTags.outros.length > 0 ? (
                  <div className="d-flex flex-wrap gap-1">
                    {globalTags.outros.map(tag => {
                      const isAlreadyAdded = factoryTags.outros.some(t => t.id === tag.id);
                      return (
                        <Badge 
                          key={tag.id} 
                          bg="secondary" 
                          className="d-flex align-items-center gap-1"
                          style={{ 
                            cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                            opacity: isAlreadyAdded ? 0.5 : 1,
                            fontSize: '14px'
                          }}
                          onClick={() => !isAlreadyAdded && addGlobalTagToFactory(tag, 'outros')}
                          title={isAlreadyAdded ? t('Já adicionada', '已添加') : t('Clique para adicionar', '点击添加')}
                        >
                          {tag.name}
                          {!isAlreadyAdded && <i className="bi bi-plus"></i>}
                        </Badge>
                      );
                    })}
                  </div>
                ) : (
                  <small className="text-muted">{t('Nenhuma tag global disponível', '没有可用的全局标签')}</small>
                )}
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
                      setUploadingImages(prev => ({ ...prev, image1: true }));
                      const imageUrl = await imageService.uploadFile(file);
                      console.log('Imagem principal enviada:', imageUrl);
                      setImageUrls(prev => ({ ...prev, image1: imageUrl }));
                    } catch (error) {
                      console.error('Erro no upload da imagem:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    } finally {
                      setUploadingImages(prev => ({ ...prev, image1: false }));
                    }
                  }
                }}
              />
              <Form.Control
                type="hidden"
                name="imageUrl1"
                defaultValue={factory?.imageUrl1 || ''}
                key={`imageUrl1-${factory?.id || 'new'}`}
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
                      setUploadingImages(prev => ({ ...prev, image2: true }));
                      const imageUrl = await imageService.uploadFile(file);
                      console.log('Imagem secundária enviada:', imageUrl);
                      setImageUrls(prev => ({ ...prev, image2: imageUrl }));
                    } catch (error) {
                      console.error('Erro no upload da imagem secundária:', error);
                      setError(t('Erro no upload da imagem', '图片上传时出错'));
                    } finally {
                      setUploadingImages(prev => ({ ...prev, image2: false }));
                    }
                  }
                }}
              />
              <Form.Control
                type="hidden"
                name="imageUrl2"
                defaultValue={factory?.imageUrl2 || ''}
                key={`imageUrl2-${factory?.id || 'new'}`}
              />
            </Form.Group>

            {/* Exibição das imagens da fábrica */}
            {(factory?.imageUrl1 || factory?.imageUrl2) && (
              <Form.Group className="mb-3">
                <Form.Label>{t('Imagens Atuais', '当前图片')}</Form.Label>
                <Row>
                  {factory?.imageUrl1 && (
                    <Col md={6} className="mb-2">
                      <div className="text-center">
                        <img
                          src={factory.imageUrl1}
                          alt={t('Imagem Principal', '主图片')}
                          className="img-fluid rounded border"
                          style={{ maxHeight: '200px', width: '100%', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => handlePreview(factory.imageUrl1)}
                        />
                        <small className="text-muted d-block mt-1">{t('Imagem Principal', '主图片')}</small>
                      </div>
                    </Col>
                  )}
                  {factory?.imageUrl2 && (
                    <Col md={6} className="mb-2">
                      <div className="text-center">
                        <img
                          src={factory.imageUrl2}
                          alt={t('Imagem Secundária', '副图片')}
                          className="img-fluid rounded border"
                          style={{ maxHeight: '200px', width: '100%', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => handlePreview(factory.imageUrl2)}
                        />
                        <small className="text-muted d-block mt-1">{t('Imagem Secundária', '副图片')}</small>
                      </div>
                    </Col>
                  )}
                </Row>
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleFactoryModalClose}>
              {t('Cancelar', '取消')}
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteFactory}
              className="me-auto"
            >
              <i className="bi bi-trash me-1"></i>
              {t('Excluir Fábrica', '删除工厂')}
            </Button>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={factorySubmitting || uploadingImages.image1 || uploadingImages.image2}
            >
              {factorySubmitting ? (
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
                t('Atualizar', '更新')
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

export default FactoryDetail;
