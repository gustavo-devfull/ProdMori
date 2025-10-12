import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Typography,
  message,
  Alert,
  Row,
  Col,
  Empty,
  Upload,
  Select,
  InputNumber,
  Space
} from 'antd';
import { 
  PlusOutlined, 
  UploadOutlined
} from '@ant-design/icons';
import CustomImage from '../components/CustomImage';
import productService from '../services/productService';
import factoryService from '../services/factoryService';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form] = Form.useForm();
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, factoriesData] = await Promise.all([
        productService.getAllProducts(),
        factoryService.getAllFactories()
      ]);
      setProducts(productsData);
      setFactories(factoriesData);
    } catch (err) {
      setError('Erro ao carregar dados');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    form.setFieldsValue(product);
    setModalVisible(true);
  };


  const handleImageUpload = async (file) => {
    try {
      setUploading(true);
      const imageUrl = await productService.uploadProductImage(file);
      form.setFieldsValue({ imageUrl });
      message.success('Imagem enviada com sucesso!');
      return false; // Prevent default upload
    } catch (err) {
      message.error(`Erro ao enviar imagem: ${err.message}`);
      console.error('Erro no upload:', err);
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, values);
        message.success('Produto atualizado com sucesso!');
      } else {
        await productService.createProduct(values);
        message.success('Produto criado com sucesso!');
      }
      setModalVisible(false);
      loadData();
    } catch (err) {
      message.error('Erro ao salvar produto');
      console.error(err);
    }
  };

  const handleFactoryFilter = (factoryId) => {
    setSelectedFactory(factoryId);
  };

  const filteredProducts = selectedFactory 
    ? products.filter(product => product.factoryId === selectedFactory)
    : products;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Produtos</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            size="large"
          >
            Novo
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          message="Erro"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Card className="content-card" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ 
            fontWeight: 'bold',
            fontSize: isMobile ? '14px' : '16px'
          }}>
            Filtrar por fábrica:
          </span>
          <Select
            placeholder="Todas as fábricas"
            style={{ 
              width: isMobile ? '100%' : '200px',
              minWidth: isMobile ? '150px' : '200px'
            }}
            value={selectedFactory}
            onChange={handleFactoryFilter}
            allowClear
          >
            {factories.map(factory => (
              <Option key={factory.id} value={factory.id}>
                {factory.name}
              </Option>
            ))}
          </Select>
          {selectedFactory && (
            <span style={{ 
              color: '#666', 
              fontSize: isMobile ? '10px' : '12px' 
            }}>
              {filteredProducts.length} produto(s) encontrado(s)
            </span>
          )}
        </Space>
      </Card>

      <Card className="content-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <div>Carregando produtos...</div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Empty 
            description={selectedFactory ? "Nenhum produto encontrado para esta fábrica" : "Nenhum produto cadastrado"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Row gutter={[12, 12]}>
            {filteredProducts.map((product) => (
              <Col xs={12} sm={12} md={12} lg={12} xl={12} key={product.id}>
                <Card
                  hoverable
                  style={{ 
                    height: isMobile ? '280px' : '420px',
                    borderRadius: isMobile ? '8px' : '12px',
                    boxShadow: isMobile ? '0 1px 4px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  styles={{ 
                    body: { 
                      padding: '0',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    },
                    cover: { margin: 0 }
                  }}
                  cover={
                    <div style={{ position: 'relative' }}>
                      <CustomImage 
                        src={product.imageUrl} 
                        alt={product.name}
                        style={{ 
                          height: isMobile ? '120px' : '220px',
                          width: '100%',
                          objectFit: 'cover'
                        }}
                        showPreview={true}
                        onPreview={(src) => {
                          setPreviewImage(src);
                          setPreviewVisible(true);
                        }}
                      />
                    </div>
                  }
                >
          <div style={{ 
            padding: isMobile ? '12px' : '24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            flex: 1
          }}>
                    {/* Nome do produto */}
                    <div style={{ 
                      fontSize: isMobile ? '13px' : '16px', 
                      fontWeight: 'bold',
                      marginBottom: isMobile ? '4px' : '6px',
                      color: '#262626',
                      lineHeight: '1.2',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: isMobile ? '32px' : '38px',
                      maxHeight: isMobile ? '32px' : '38px'
                    }}>
                      {product.name}
                    </div>

                    {/* Tag da fábrica */}
                    {product.factory && (
                      <div style={{ 
                        marginBottom: isMobile ? '6px' : '8px',
                        display: 'flex',
                        justifyContent: 'center'
                      }}>
                        <div style={{ 
                          padding: isMobile ? '2px 6px' : '4px 8px', 
                          backgroundColor: 'rgba(24, 144, 255, 0.9)', 
                          borderRadius: isMobile ? '8px' : '12px',
                          fontSize: isMobile ? '9px' : '11px', 
                          fontWeight: 'bold',
                          color: 'white',
                          backdropFilter: 'blur(4px)',
                          textAlign: 'center'
                        }}>
                          {product.factory.name}
                        </div>
                      </div>
                    )}
                    
                    {/* Preço */}
                    <div style={{ 
                      marginBottom: isMobile ? '8px' : '12px'
                    }}>
                      <div style={{ 
                        fontSize: isMobile ? '16px' : '26px', 
                        fontWeight: 'bold',
                        color: '#1890ff',
                        marginBottom: '4px'
                      }}>
                        {product.price ? `¥ ${product.price.toFixed(2)}` : 'Preço sob consulta'}
                      </div>
                    </div>

                    {/* Botão Ver Detalhes */}
                    <Button
                      type="primary"
                      size={isMobile ? "small" : "middle"}
                      onClick={() => handleEdit(product)}
                      style={{
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: isMobile ? '13px' : '15px',
                        height: isMobile ? '32px' : '40px',
                        width: '100%',
                        boxShadow: '0 3px 12px rgba(24, 144, 255, 0.4)',
                        border: 'none',
                        background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 5px 16px rgba(24, 144, 255, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 3px 12px rgba(24, 144, 255, 0.4)';
                      }}
                    >
                      Ver Detalhes
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Modal
        title={editingProduct ? 'Editar Produto' : 'Novo Produto'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={isMobile ? '100%' : 800}
        className={isMobile ? 'mobile-modal' : ''}
        style={isMobile ? { margin: 0, top: 0 } : {}}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mobile-form"
        >
          <Form.Item
            name="imageUrl"
            label="Imagem do Produto"
          >
            <div>
              <Upload
                beforeUpload={handleImageUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button 
                  icon={<UploadOutlined />} 
                  loading={uploading}
                  disabled={uploading}
                >
                  {uploading ? 'Enviando...' : 'Enviar Imagem'}
                </Button>
              </Upload>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const imageUrl = getFieldValue('imageUrl');
                  return imageUrl ? (
                    <div style={{ marginTop: 16 }}>
                      <CustomImage
                        src={imageUrl}
                        style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: '8px' }}
                      />
                    </div>
                  ) : null;
                }}
              </Form.Item>
            </div>
          </Form.Item>

          <Form.Item
            name="name"
            label="Nome do Produto"
            rules={[{ required: true, message: 'Por favor, insira o nome!' }]}
          >
            <Input placeholder="Digite o nome do produto" />
          </Form.Item>

          <Form.Item
            name="segment"
            label="Segmento"
            rules={[{ required: true, message: 'Por favor, insira o segmento!' }]}
          >
            <Input placeholder="Digite o segmento" />
          </Form.Item>

          <Form.Item
            name="dimensions"
            label="Medidas"
            rules={[{ required: true, message: 'Por favor, insira as medidas!' }]}
          >
            <Input placeholder="Ex: 10x20x5 cm" />
          </Form.Item>

          <Form.Item
            name="price"
            label="Preço (¥)"
            rules={[{ required: true, message: 'Por favor, insira o preço!' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Digite o preço"
              min={0}
              precision={2}
            />
          </Form.Item>

          <Form.Item
            name="moq"
            label="MOQ (Minimum Order Quantity)"
            rules={[{ required: true, message: 'Por favor, insira o MOQ!' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Digite o MOQ"
              min={1}
            />
          </Form.Item>

          <Form.Item
            name="factoryId"
            label="Fábrica/Loja"
            rules={[{ required: true, message: 'Por favor, selecione uma fábrica!' }]}
          >
            <Select placeholder="Selecione uma fábrica/loja">
              {factories.map(factory => (
                <Option key={factory.id} value={factory.id}>
                  {factory.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="observations"
            label="Observações"
          >
            <TextArea
              rows={4}
              placeholder="Digite observações adicionais"
            />
          </Form.Item>

          <Form.Item>
            <div className="mobile-buttons">
              <Button type="primary" htmlType="submit" size="large">
                {editingProduct ? 'Atualizar' : 'Criar'}
              </Button>
              <Button onClick={() => setModalVisible(false)} size="large">
                Cancelar
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de Preview da Imagem */}
      <Modal
        title="Visualizar Imagem"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width="auto"
        centered
        style={{ maxWidth: '90vw' }}
      >
        <div style={{ textAlign: 'center' }}>
          <img
            src={previewImage}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '80vh',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default Products;
