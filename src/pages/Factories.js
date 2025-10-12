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
  Tag,
  List,
  Avatar,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ShopOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import factoryService from '../services/factoryService';

const { Title } = Typography;
const { TextArea } = Input;

const Factories = () => {
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFactory, setEditingFactory] = useState(null);
  const [form] = Form.useForm();
  const [error, setError] = useState(null);

  useEffect(() => {
    loadFactories();
  }, []);

  const loadFactories = async () => {
    try {
      setLoading(true);
      const factoriesData = await factoryService.getAllFactories();
      
      // Carregar produtos para cada fábrica
      const factoriesWithProducts = await Promise.all(
        factoriesData.map(async (factory) => {
          try {
            const products = await factoryService.getProductsByFactory(factory.id);
            return { ...factory, products };
          } catch (err) {
            console.error(`Erro ao carregar produtos da fábrica ${factory.name}:`, err);
            return { ...factory, products: [] };
          }
        })
      );
      
      setFactories(factoriesWithProducts);
    } catch (err) {
      setError('Erro ao carregar fábricas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingFactory(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (factory) => {
    setEditingFactory(factory);
    form.setFieldsValue(factory);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await factoryService.deleteFactory(id);
      message.success('Fábrica excluída com sucesso!');
      loadFactories();
    } catch (err) {
      message.error('Erro ao excluir fábrica');
      console.error(err);
    }
  };

  const handleSubmit = async (values) => {
    try {
      if (editingFactory) {
        await factoryService.updateFactory(editingFactory.id, values);
        message.success('Fábrica atualizada com sucesso!');
      } else {
        await factoryService.createFactory(values);
        message.success('Fábrica criada com sucesso!');
      }
      setModalVisible(false);
      loadFactories();
    } catch (err) {
      message.error('Erro ao salvar fábrica');
      console.error(err);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>Fábricas/Lojas</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            size="large"
          >
            Nova
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

      <Card className="content-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <div>Carregando fábricas...</div>
          </div>
        ) : factories.length === 0 ? (
          <Empty 
            description="Nenhuma fábrica cadastrada"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Row gutter={[16, 16]}>
            {factories.map((factory) => (
              <Col xs={24} sm={12} lg={8} key={factory.id}>
                <Card
                  hoverable
                  style={{ height: '100%' }}
                  actions={[
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(factory)}
                      size="small"
                      style={{ fontSize: '14px', padding: '16px 32px', height: 'auto' }}
                    />,
                    <Popconfirm
                      title="Tem certeza que deseja excluir esta fábrica?"
                      onConfirm={() => handleDelete(factory.id)}
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
                  <Card.Meta
                    avatar={<Avatar icon={<ShopOutlined />} size="large" />}
                    title={factory.name}
                    description={
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <Tag color="blue">{factory.segment || 'Sem segmento'}</Tag>
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          <div style={{ marginBottom: 4 }}>
                            <PhoneOutlined /> {factory.contact}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <EnvironmentOutlined /> {factory.location}
                          </div>
                          {factory.observations && (
                            <div>
                              <FileTextOutlined /> {factory.observations.length > 50 
                                ? `${factory.observations.substring(0, 50)}...` 
                                : factory.observations}
                            </div>
                          )}
                        </div>
                      </div>
                    }
                  />
                  
                  {factory.products && factory.products.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: 8 }}>
                        Produtos ({factory.products.length})
                      </div>
                      <List
                        size="small"
                        dataSource={factory.products.slice(0, 3)}
                        renderItem={(product) => (
                          <List.Item style={{ padding: '4px 0' }}>
                            <div style={{ fontSize: '12px' }}>
                              {product.name} - {product.segment || 'Sem segmento'}
                            </div>
                          </List.Item>
                        )}
                      />
                      {factory.products.length > 3 && (
                        <div style={{ fontSize: '12px', color: '#666', textAlign: 'center', marginTop: 8 }}>
                          +{factory.products.length - 3} produtos
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      <Modal
        title={editingFactory ? 'Editar Fábrica/Loja' : 'Nova Fábrica/Loja'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={window.innerWidth < 768 ? '100%' : 600}
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
            name="name"
            label="Nome da Fábrica/Loja"
            rules={[{ required: true, message: 'Por favor, insira o nome!' }]}
          >
            <Input placeholder="Digite o nome da fábrica/loja" />
          </Form.Item>

          <Form.Item
            name="contact"
            label="Contato"
            rules={[{ required: true, message: 'Por favor, insira o contato!' }]}
          >
            <Input placeholder="Digite o contato" />
          </Form.Item>

          <Form.Item
            name="location"
            label="Localização"
            rules={[{ required: true, message: 'Por favor, insira a localização!' }]}
          >
            <Input placeholder="Digite a localização" />
          </Form.Item>

          <Form.Item
            name="segment"
            label="Segmento"
            rules={[{ required: true, message: 'Por favor, insira o segmento!' }]}
          >
            <Input placeholder="Ex: Eletrônicos, Têxtil, Brinquedos, etc." />
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
                {editingFactory ? 'Atualizar' : 'Criar'}
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

export default Factories;
