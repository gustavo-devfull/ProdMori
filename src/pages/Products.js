import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Typography,
  Popconfirm,
  message,
  Alert,
  Row,
  Col,
  Empty,
  Upload,
  Image,
  Select,
  InputNumber,
  Space
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  UploadOutlined,
  ShoppingOutlined
} from '@ant-design/icons';
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

  useEffect(() => {
    loadData();
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

  const handleDelete = async (id) => {
    try {
      await productService.deleteProduct(id);
      message.success('Produto excluído com sucesso!');
      loadData();
    } catch (err) {
      message.error('Erro ao excluir produto');
      console.error(err);
    }
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
          <span style={{ fontWeight: 'bold' }}>Filtrar por fábrica:</span>
          <Select
            placeholder="Todas as fábricas"
            style={{ width: 200 }}
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
            <span style={{ color: '#666', fontSize: '12px' }}>
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
          <Row gutter={[16, 16]}>
            {filteredProducts.map((product) => (
              <Col xs={12} sm={8} md={6} lg={4} key={product.id}>
                <Card
                  hoverable
                  style={{ height: '100%' }}
                  styles={{ body: { padding: '8px' } }}
                  cover={
                    <div>
                      {product.factory && (
                        <div style={{ 
                          padding: '8px 12px', 
                          backgroundColor: '#f0f0f0', 
                          fontSize: '12px', 
                          fontWeight: 'bold',
                          color: '#666',
                          textAlign: 'center',
                          borderBottom: '1px solid #d9d9d9'
                        }}>
                          {product.factory.name}
                        </div>
                      )}
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          style={{ 
                            height: '200px', 
                            width: '100%',
                            objectFit: 'contain' 
                          }}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
                        />
                      ) : (
                        <div style={{ 
                          height: '200px', 
                          width: '100%',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: '#f5f5f5',
                          color: '#999'
                        }}>
                          <ShoppingOutlined style={{ fontSize: '48px' }} />
                        </div>
                      )}
                    </div>
                  }
                  actions={[
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(product)}
                      size="small"
                      style={{ fontSize: '14px', padding: '16px 32px', height: 'auto' }}
                    />,
                    <Popconfirm
                      title="Tem certeza que deseja excluir este produto?"
                      onConfirm={() => handleDelete(product.id)}
                      okText="Sim"
                      cancelText="Não"
                    >
                      <Button
                        type="primary"
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        style={{ fontSize: '14px', padding: '16px 32px', height: 'auto' }}
                      />
                    </Popconfirm>
                  ]}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 'bold', 
                      marginBottom: '4px',
                      lineHeight: '1.2'
                    }}>
                      {product.name}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>
                        {product.price ? `R$ ${product.price.toFixed(2)}` : 'Sem preço'}
                      </span>
                    </div>
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
        width={window.innerWidth < 768 ? '100%' : 800}
        className={window.innerWidth < 768 ? 'mobile-modal' : ''}
        style={window.innerWidth < 768 ? { margin: 0, top: 0 } : {}}
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
                      <Image
                        width={200}
                        height={200}
                        src={imageUrl}
                        style={{ objectFit: 'cover', borderRadius: '8px' }}
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
    </div>
  );
};

export default Products;
