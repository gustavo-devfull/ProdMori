import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Row,
  Col,
  Alert,
  Spinner
} from 'react-bootstrap';
import CustomImage from '../components/CustomImage';
import productServiceAPI from '../services/productServiceAPI';
import factoryServiceAPI from '../services/factoryServiceAPI';
import imageService from '../services/imageService';
import { useLanguage } from '../contexts/LanguageContext';

const Products = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState(null);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsData, factoriesData] = await Promise.all([
        productServiceAPI.getAllProducts(),
        factoryServiceAPI.getAllFactories()
      ]);
      
      setProducts(productsData);
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
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [loadData]);

  const handleImageUpload = async (file) => {
    try {
      const imageUrl = await imageService.uploadFile(file);
      return imageUrl;
    } catch (err) {
      setError(t('Erro ao fazer upload da imagem', '图片上传时出错'));
      console.error(err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const values = Object.fromEntries(formData.entries());
    
    // Converter preço para número se existir
    if (values.price && values.price !== '') {
      values.price = parseFloat(values.price);
    }
    
    try {
      setSubmitting(true);
      
      if (editingProduct) {
        await productServiceAPI.updateProduct(editingProduct.id, values);
      } else {
        await productServiceAPI.createProduct(values);
      }
      
      setModalVisible(false);
      setEditingProduct(null);
      await loadData();
    } catch (err) {
      setError(t('Erro ao salvar produto', '保存产品时出错'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setModalVisible(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita. | 确定要删除这个产品吗？此操作无法撤销。')) {
      return;
    }

    try {
      setSubmitting(true);
      await productServiceAPI.deleteProduct(productId);
      setModalVisible(false);
      setEditingProduct(null);
      await loadData();
      setError(null);
    } catch (err) {
      setError(t('Erro ao excluir produto', '删除产品时出错'));
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };


  const handleModalClose = () => {
    setModalVisible(false);
    setEditingProduct(null);
  };

  const handlePreview = (imageUrl) => {
    setPreviewImage(imageUrl);
    setPreviewVisible(true);
  };

  const handleFactoryFilter = (factoryId) => {
    setSelectedFactory(factoryId);
  };

  const handleSegmentFilter = (segment) => {
    setSelectedSegment(segment);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const filteredProducts = products.filter(product => {
    const matchesFactory = !selectedFactory || product.factory?.id === selectedFactory;
    const matchesSegment = !selectedSegment || product.segment === selectedSegment;
    
    // Busca em todos os campos do produto
    const searchFields = [
      product.name,
      product.segment,
      product.description,
      product.material,
      product.capacity,
      product.colors,
      product.moq,
      product.dimensions,
      product.factory?.name,
      product.ref,
      product.englishDescription,
      product.remark,
      product.obs,
      product.ncm
    ].filter(Boolean).join(' ').toLowerCase();
    
    const matchesSearch = !searchTerm || searchFields.includes(searchTerm.toLowerCase());
    
    return matchesFactory && matchesSegment && matchesSearch;
  });

  // Agrupar produtos por fábrica
  const groupedProducts = filteredProducts.reduce((groups, product) => {
    const factoryName = product.factory?.name || 'Sem Fábrica';
    if (!groups[factoryName]) {
      groups[factoryName] = [];
    }
    groups[factoryName].push(product);
    return groups;
  }, {});

  const uniqueSegments = [...new Set(products.map(p => p.segment).filter(Boolean))];

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
          <h2 className="mb-0 fs-5 fw-semibold">{t('Produtos', '产品')}</h2>
          <Button 
            variant="light"
            className="text-primary fw-semibold"
            onClick={() => setModalVisible(true)}
            style={{ 
              backgroundColor: 'white', 
              borderColor: 'white',
              color: '#0d6efd'
            }}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Novo Produto | 新产品
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="danger" className="mb-3">
          <Alert.Heading>Erro | 错误</Alert.Heading>
          {error}
        </Alert>
      )}

      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex flex-wrap gap-3 align-items-center">
            <div className="flex-grow-1" style={{ minWidth: '200px' }}>
              <Form.Control
                type="text"
                placeholder="Buscar em todos os campos | 搜索所有字段"
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            
            <div className="flex-grow-1" style={{ minWidth: '200px' }}>
              <Form.Select
                value={selectedFactory || ''}
                onChange={(e) => handleFactoryFilter(e.target.value || null)}
              >
                <option value="">Todas as fábricas | 所有工厂</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </Form.Select>
            </div>
            
            <div className="flex-grow-1" style={{ minWidth: '200px' }}>
              <Form.Select
                value={selectedSegment || ''}
                onChange={(e) => handleSegmentFilter(e.target.value || null)}
              >
                <option value="">Todos os segmentos | 所有行业</option>
                {uniqueSegments.map(segment => (
                  <option key={segment} value={segment}>
                    {segment}
                  </option>
                ))}
              </Form.Select>
            </div>
            
            {(selectedFactory || selectedSegment || searchTerm) && (
              <small className="text-muted">
                {filteredProducts.length} produto(s) encontrado(s)
              </small>
            )}
          </div>
        </Card.Body>
      </Card>

      {filteredProducts.length === 0 ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="bi bi-bag text-muted fs-1"></i>
            <h5 className="mt-3 text-muted">Nenhum produto encontrado</h5>
            <p className="text-muted">Clique em "Novo Produto" para começar</p>
          </Card.Body>
        </Card>
      ) : (
        <div>
          {Object.entries(groupedProducts).map(([factoryName, factoryProducts]) => (
            <div key={factoryName} className="mb-4">
              <h4 className="mb-3 text-primary border-bottom pb-2">
                <i className="bi bi-building me-2"></i>
                {factoryName} ({factoryProducts.length} produtos)
              </h4>
              <Row className="justify-content-center" style={{ gap: '48px' }}>
                {factoryProducts.map(product => (
                  <Col xs={12} sm={6} md={4} lg={3} xl={2} key={product.id}>
                    <Card className="h-100">
                      <div className="position-relative">
                        <CustomImage
                          src={(() => {
                            const imageUrl = imageService.getImageUrl(product.imageUrl);
                            console.log(`Product ${product.name} - imageUrl:`, product.imageUrl, 'processed:', imageUrl);
                            return imageUrl;
                          })()}
                          alt={product.name}
                          style={{ 
                            height: '250px',
                            width: '100%',
                            objectFit: 'cover'
                          }}
                          showPreview={true}
                          onPreview={handlePreview}
                        />
                      </div>
                      
                      <Card.Body className="d-flex flex-column p-3">
                        {/* Campos do produto */}
                        <div className="mb-3">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="card-title mb-0" style={{ 
                              fontSize: isMobile ? '16px' : '15px',
                              lineHeight: '1.2',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: '1',
                              marginRight: '10px'
                            }}>{product.name}</h5>
                            
                            <div className="fs-5 fw-bold text-primary" style={{ fontSize: isMobile ? '18px' : '16px' }}>
                              {product.price && typeof product.price === 'number' ? `¥ ${product.price.toFixed(2)}` : 'Sob consulta | 咨询价格'}
                            </div>
                          </div>
                          
                          {/* Novos campos */}
                          <div className="small text-muted">
                            {product.ref && <div><strong>{t('REF', '参考号')}:</strong> {product.ref}</div>}
                            {product.description && <div><strong>{t('DESCRIPTION', '描述')}:</strong> {product.description}</div>}
                            {product.remark && <div><strong>{t('REMARK', '备注')}:</strong> {product.remark}</div>}
                            {product.obs && <div><strong>{t('OBS', '观察')}:</strong> {product.obs}</div>}
                            {product.ncm && <div><strong>{t('NCM', 'NCM代码')}:</strong> {product.ncm}</div>}
                            {product.englishDescription && <div><strong>{t('English Description', '英文描述')}:</strong> {product.englishDescription}</div>}
                            {product.ctns && <div><strong>{t('CTNS', '箱数')}:</strong> {product.ctns}</div>}
                            {product.unitCtn && <div><strong>{t('UNIT/CTN', '每箱单位')}:</strong> {product.unitCtn}</div>}
                            {product.qty && <div><strong>{t('QTY', '数量')}:</strong> {product.qty}</div>}
                            {product.uPrice && <div><strong>{t('U.PRICE', '单价')}:</strong> {product.uPrice}</div>}
                            {product.unit && <div><strong>{t('UNIT', '单位')}:</strong> {product.unit}</div>}
                            {product.amount && <div><strong>{t('AMOUNT', '金额')}:</strong> {product.amount}</div>}
                            {product.l && <div><strong>{t('L', 'L')}:</strong> {product.l}</div>}
                            {product.w && <div><strong>{t('W', 'W')}:</strong> {product.w}</div>}
                            {product.h && <div><strong>{t('H', 'H')}:</strong> {product.h}</div>}
                            {product.cbm && <div><strong>{t('CBM', '立方米')}:</strong> {product.cbm}</div>}
                            {product.gW && <div><strong>{t('G.W', 'G.W')}:</strong> {product.gW}</div>}
                            {product.nW && <div><strong>{t('N.W', 'N.W')}:</strong> {product.nW}</div>}
                            {product.pesoUnitario && <div><strong>{t('Peso Unitário(g)', '单位重量(克)')}:</strong> {product.pesoUnitario}</div>}
                          </div>
                        </div>
                        
                        <div className="mt-auto">
                          <Button 
                            variant="primary" 
                            className="w-100"
                            size={isMobile ? 'lg' : 'md'}
                            style={{ fontSize: isMobile ? '16px' : '14px' }}
                            onClick={() => handleEdit(product)}
                          >
                            Ver Detalhes | 查看详情
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </div>
      )}

      <Modal show={modalVisible} onHide={handleModalClose} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingProduct ? t('Editar Produto', '编辑产品') : t('Novo Produto', '新产品')}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Imagem do Produto | 产品图片</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    try {
                      const imageUrl = await handleImageUpload(file);
                      e.target.form.imageUrl.value = imageUrl;
                    } catch (err) {
                      console.error('Erro no upload:', err);
                    }
                  }
                }}
              />
              <Form.Control
                type="hidden"
                name="imageUrl"
                defaultValue={editingProduct?.imageUrl || ''}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Nome do Produto', '产品名称')}</Form.Label>
              <Form.Control
                type="text"
                name="name"
                defaultValue={editingProduct?.name || ''}
                placeholder={t('Digite o nome do produto', '输入产品名称')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Segmento', '行业')}</Form.Label>
              <Form.Control
                type="text"
                name="segment"
                defaultValue={editingProduct?.segment || ''}
                placeholder={t('Digite o segmento', '输入行业')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Preço', '价格')}</Form.Label>
              <Form.Control
                type="number"
                name="price"
                step="0.01"
                defaultValue={editingProduct?.price || ''}
                placeholder={t('Digite o preço', '输入价格')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Fábrica', '工厂')}</Form.Label>
              <Form.Select
                name="factoryId"
                defaultValue={editingProduct?.factory?.id || ''}
              >
                <option value="">{t('Selecione uma fábrica', '选择工厂')}</option>
                {factories.map(factory => (
                  <option key={factory.id} value={factory.id}>
                    {factory.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Medidas', '尺寸')}</Form.Label>
              <Form.Control
                type="text"
                name="dimensions"
                defaultValue={editingProduct?.dimensions || ''}
                placeholder={t('Digite as medidas (ex: 10x20x30cm)', '输入尺寸（例：10x20x30cm）')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Material', '材料')}</Form.Label>
              <Form.Control
                type="text"
                name="material"
                defaultValue={editingProduct?.material || ''}
                placeholder={t('Digite o material', '输入材料')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Capacidade', '容量')}</Form.Label>
              <Form.Control
                type="text"
                name="capacity"
                defaultValue={editingProduct?.capacity || ''}
                placeholder={t('Digite a capacidade', '输入容量')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Cores', '颜色')}</Form.Label>
              <Form.Control
                type="text"
                name="colors"
                defaultValue={editingProduct?.colors || ''}
                placeholder={t('Digite as cores disponíveis', '输入可用颜色')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('MOQ', '最小订购量')}</Form.Label>
              <Form.Control
                type="text"
                name="moq"
                defaultValue={editingProduct?.moq || ''}
                placeholder={t('Digite o MOQ (Minimum Order Quantity)', '输入最小订购量')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Descrição', '描述')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                defaultValue={editingProduct?.description || ''}
                placeholder="Digite uma descrição | 输入描述"
              />
            </Form.Group>

            {/* Novos campos */}
            <Form.Group className="mb-3">
              <Form.Label>{t('REF', '参考号')}</Form.Label>
              <Form.Control
                type="text"
                name="ref"
                defaultValue={editingProduct?.ref || ''}
                placeholder={t('Digite a referência', '输入参考号')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('REMARK', '备注')}</Form.Label>
              <Form.Control
                type="text"
                name="remark"
                defaultValue={editingProduct?.remark || ''}
                placeholder={t('Digite observações', '输入备注')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('OBS', '观察')}</Form.Label>
              <Form.Control
                type="text"
                name="obs"
                defaultValue={editingProduct?.obs || ''}
                placeholder={t('Digite observações adicionais', '输入额外观察')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('NCM', 'NCM代码')}</Form.Label>
              <Form.Control
                type="text"
                name="ncm"
                defaultValue={editingProduct?.ncm || ''}
                placeholder={t('Digite o código NCM', '输入NCM代码')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('English Description', '英文描述')}</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="englishDescription"
                defaultValue={editingProduct?.englishDescription || ''}
                placeholder={t('Digite a descrição em inglês', '输入英文描述')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('CTNS', '箱数')}</Form.Label>
              <Form.Control
                type="text"
                name="ctns"
                defaultValue={editingProduct?.ctns || ''}
                placeholder={t('Digite quantidade de caixas', '输入箱数')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('UNIT/CTN', '每箱单位')}</Form.Label>
              <Form.Control
                type="text"
                name="unitCtn"
                defaultValue={editingProduct?.unitCtn || ''}
                placeholder={t('Digite unidades por caixa', '输入每箱单位数')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('QTY', '数量')}</Form.Label>
              <Form.Control
                type="text"
                name="qty"
                defaultValue={editingProduct?.qty || ''}
                placeholder={t('Digite a quantidade', '输入数量')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('U.PRICE', '单价')}</Form.Label>
              <Form.Control
                type="text"
                name="uPrice"
                defaultValue={editingProduct?.uPrice || ''}
                placeholder={t('Digite o preço unitário', '输入单价')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('UNIT', '单位')}</Form.Label>
              <Form.Control
                type="text"
                name="unit"
                defaultValue={editingProduct?.unit || ''}
                placeholder={t('Digite a unidade', '输入单位')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('AMOUNT', '金额')}</Form.Label>
              <Form.Control
                type="text"
                name="amount"
                defaultValue={editingProduct?.amount || ''}
                placeholder={t('Digite o valor total', '输入总金额')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('L (Length)', 'L (长度)')}</Form.Label>
              <Form.Control
                type="text"
                name="l"
                defaultValue={editingProduct?.l || ''}
                placeholder={t('Digite o comprimento', '输入长度')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('W (Width)', 'W (宽度)')}</Form.Label>
              <Form.Control
                type="text"
                name="w"
                defaultValue={editingProduct?.w || ''}
                placeholder={t('Digite a largura', '输入宽度')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('H (Height)', 'H (高度)')}</Form.Label>
              <Form.Control
                type="text"
                name="h"
                defaultValue={editingProduct?.h || ''}
                placeholder={t('Digite a altura', '输入高度')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('CBM', '立方米')}</Form.Label>
              <Form.Control
                type="text"
                name="cbm"
                defaultValue={editingProduct?.cbm || ''}
                placeholder={t('Digite o volume em CBM', '输入立方米体积')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('G.W (Gross Weight)', 'G.W (毛重)')}</Form.Label>
              <Form.Control
                type="text"
                name="gW"
                defaultValue={editingProduct?.gW || ''}
                placeholder={t('Digite o peso bruto', '输入毛重')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('N.W (Net Weight)', 'N.W (净重)')}</Form.Label>
              <Form.Control
                type="text"
                name="nW"
                defaultValue={editingProduct?.nW || ''}
                placeholder={t('Digite o peso líquido', '输入净重')}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>{t('Peso Unitário(g)', '单位重量(克)')}</Form.Label>
              <Form.Control
                type="text"
                name="pesoUnitario"
                defaultValue={editingProduct?.pesoUnitario || ''}
                placeholder={t('Digite o peso unitário em gramas', '输入单位重量(克)')}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose}>
              {t('Cancelar', '取消')}
            </Button>
            {editingProduct && (
              <Button 
                variant="danger" 
                onClick={() => handleDelete(editingProduct.id)}
                disabled={submitting}
                style={{ marginRight: 'auto' }}
              >
                {submitting ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    {t('Excluindo...', '删除中...')}
                  </>
                ) : (
                  t('Excluir Produto', '删除产品')
                )}
              </Button>
            )}
            <Button variant="primary" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {t('Salvando...', '保存中...')}
                </>
              ) : (
                editingProduct ? t('Atualizar', '更新') : t('Criar', '创建')
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={previewVisible} onHide={() => setPreviewVisible(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Visualizar Imagem | 查看图片</Modal.Title>
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

export default Products;