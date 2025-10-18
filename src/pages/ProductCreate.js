import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Form,
  Row,
  Col,
  Alert,
  Spinner,
  Container
} from 'react-bootstrap';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import productServiceAPI from '../services/productServiceAPI';
import factoryServiceAPI from '../services/factoryServiceAPI';
import imageService from '../services/imageService';
import CustomImage from '../components/CustomImage';
import AudioRecorder from '../components/AudioRecorder';
import { useLanguage } from '../contexts/LanguageContext';

const ProductCreate = () => {
  const { factoryId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  
  // Detectar se é mobile
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   window.innerWidth <= 768;
  
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Dados do produto sendo editado (se vier da URL)
  const editingProduct = location.state?.editingProduct || null;

  // Função para limpeza agressiva de cache e refresh forçado no mobile
  const forceRefreshIfMobile = () => {
    if (isMobile) {
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
        window.location.reload(true);
      }, 500);
      
      return true; // Indica que foi feito refresh
    }
    return false; // Não é mobile, não fez refresh
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const factoriesData = await factoryServiceAPI.getAllFactories();
      setFactories(factoriesData);
      setError(null);
    } catch (err) {
      setError(t('Erro ao carregar dados', '加载数据时出错'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true);
      const uploadedImageUrl = await imageService.uploadFile(file);
      setImageUrl(uploadedImageUrl);
      return uploadedImageUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      setError(t('Erro no upload da imagem', '图片上传时出错'));
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const handlePreview = (imageSrc) => {
    setPreviewImage(imageSrc);
    setPreviewVisible(true);
  };

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
        audioUrl: currentAudioUrl || values.audioUrl
      };
      
      console.log('=== HANDLE SUBMIT ===');
      console.log('Current audioUrl:', currentAudioUrl);
      console.log('Values audioUrl:', values.audioUrl);
      console.log('Final audioUrl:', finalValues.audioUrl);
      console.log('Final values:', finalValues);
      
      if (editingProduct) {
        await productServiceAPI.updateProduct(editingProduct.id, finalValues);
      } else {
        await productServiceAPI.createProduct(finalValues);
      }
      
      // Verificar se é mobile e forçar refresh
      console.log('🔄 Verificando se deve fazer refresh após operação...');
      if (forceRefreshIfMobile()) {
        console.log('📱 Refresh foi executado, retornando...');
        return; // Refresh foi feito, não precisa continuar
      }
      console.log('💻 Não é mobile ou refresh não foi necessário, continuando...');
      
      setImageUrl('');
      
      // Redirecionar para a fábrica individual se factoryId estiver presente
      if (factoryId) {
        console.log('🏭 Redirecionando para fábrica individual:', factoryId);
        navigate(`/factory/${factoryId}`);
      } else {
        console.log('📦 Redirecionando para página de produtos');
        navigate('/products');
      }
      
    } catch (err) {
      setError(t('Erro ao salvar produto', '保存产品时出错'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Voltar para a página anterior ou para produtos
    if (factoryId) {
      navigate(`/factory/${factoryId}`);
    } else {
      navigate('/products');
    }
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" />
          <p className="mt-3">{t('Carregando...', '加载中...')}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0">
              {editingProduct ? t('Editar Produto', '编辑产品') : t('Cadastrar Produto', '注册产品')}
            </h4>
            <Button variant="outline-secondary" onClick={handleCancel}>
              <i className="bi bi-arrow-left me-1"></i>
              {t('Voltar', '返回')}
            </Button>
          </div>
        </Card.Header>
        
        <Card.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            {/* Botão salvar no topo */}
            <div className="d-flex justify-content-end mb-3">
              <Button 
                variant="success" 
                type="submit" 
                disabled={submitting}
                className="d-flex align-items-center"
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
            </div>

            {/* Seleção da Fábrica */}
            <Form.Group className="mb-3">
              <Form.Label>{t('Fábrica', '工厂')}</Form.Label>
              <Form.Select
                name="factoryId"
                defaultValue={editingProduct?.factoryId || factoryId || ''}
                required
              >
                <option value="">{t('Selecione uma fábrica', '选择工厂')}</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </Form.Select>
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
                      await handleImageUpload(file);
                    } catch (err) {
                      console.error('Erro no upload:', err);
                    }
                  }
                }}
                disabled={uploadingImage}
              />
              {uploadingImage && (
                <div className="mt-2 text-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Enviando imagem...', '上传图片中...')}
                </div>
              )}
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
                    defaultValue={editingProduct?.unitCtn || ''}
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

            {/* Botões no final */}
            <div className="d-flex justify-content-between">
              <Button variant="secondary" onClick={handleCancel}>
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
                    {editingProduct ? t('Atualizar', '更新') : t('Criar', '创建')}
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Modal de preview da imagem */}
      {previewVisible && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('Visualizar Imagem', '查看图片')}</h5>
                <Button 
                  variant="outline-secondary" 
                  onClick={() => setPreviewVisible(false)}
                >
                  <i className="bi bi-x"></i>
                </Button>
              </div>
              <div className="modal-body text-center">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="img-fluid rounded"
                  style={{ maxHeight: '70vh' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default ProductCreate;
