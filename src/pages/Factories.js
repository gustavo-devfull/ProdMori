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
  Empty,
  Spin,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  PhoneOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import factoryService from '../services/factoryService';

const { Title } = Typography;
const { TextArea } = Input;

const Factories = () => {
  const [factories, setFactories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingFactory, setEditingFactory] = useState(null);
  const [form] = Form.useForm();
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFactories();
  }, []);

  const loadFactories = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const factoriesData = await factoryService.getAllFactories();
      
      // Carregar produtos para cada fábrica com melhor tratamento de erro
      const factoriesWithProducts = await Promise.all(
        factoriesData.map(async (factory) => {
          try {
            const products = await factoryService.getProductsByFactory(factory.id);
            return { ...factory, products: products || [] };
          } catch (err) {
            console.error(`Erro ao carregar produtos da fábrica ${factory.name}:`, err);
            return { ...factory, products: [] };
          }
        })
      );
      
      setFactories(factoriesWithProducts);
      
      if (showRefresh) {
        message.success('Fábricas atualizadas com sucesso!');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao carregar fábricas';
      setError(errorMessage);
      message.error(errorMessage);
      console.error('Erro ao carregar fábricas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao excluir fábrica';
      message.error(errorMessage);
      console.error('Erro ao excluir fábrica:', err);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      if (editingFactory) {
        await factoryService.updateFactory(editingFactory.id, values);
        message.success('Fábrica atualizada com sucesso!');
      } else {
        await factoryService.createFactory(values);
        message.success('Fábrica criada com sucesso!');
      }
      
      setModalVisible(false);
      form.resetFields();
      loadFactories();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao salvar fábrica';
      message.error(errorMessage);
      console.error('Erro ao salvar fábrica:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <Title level={3} style={{ margin: 0 }}>Fábricas/Lojas</Title>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Tooltip title="Atualizar lista">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadFactories(true)}
                loading={refreshing}
                size="large"
              >
                Atualizar
              </Button>
            </Tooltip>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              size="large"
            >
              Nova Fábrica
            </Button>
          </div>
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
            <Spin size="large" />
            <div style={{ marginTop: '16px', fontSize: '16px' }}>Carregando fábricas...</div>
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
                  bodyStyle={{ padding: '12px' }}
                  actions={[
                    <Tooltip title="Editar fábrica">
                      <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(factory)}
                        size="small"
                        style={{ 
                          fontSize: '14px', 
                          padding: '8px 16px', 
                          height: 'auto',
                          width: '50%',
                          borderRadius: '4px'
                        }}
                      >
                        Editar
                      </Button>
                    </Tooltip>,
                    <Popconfirm
                      title="Excluir Fábrica"
                      description="Tem certeza que deseja excluir esta fábrica? Esta ação não pode ser desfeita."
                      onConfirm={() => handleDelete(factory.id)}
                      okText="Sim, excluir"
                      cancelText="Cancelar"
                      okType="danger"
                    >
                      <Tooltip title="Excluir fábrica">
                        <Button
                          type="primary"
                          danger
                          icon={<DeleteOutlined />}
                          size="small"
                          style={{ 
                            fontSize: '14px', 
                            padding: '8px 16px', 
                            height: 'auto',
                            width: '50%',
                            borderRadius: '4px'
                          }}
                        >
                          Excluir
                        </Button>
                      </Tooltip>
                    </Popconfirm>
                  ]}
                >
                  <div style={{ margin: '0px', padding: '12px', borderRadius: '6px',
                    backgroundColor: '#f0f0f0',
                   }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: 'bold', 
                      marginBottom: '8px',
                      color: '#262626',
                      
                    }}>
                      {factory.name}
                    </div>
                    
                    <div style={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: '8px',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <Tag color="blue">{factory.segment || 'Sem segmento'}</Tag>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        <EnvironmentOutlined /> {factory.location}
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#737373' }}>
                      <div style={{ marginBottom: 4 }}>
                        <PhoneOutlined /> {factory.contact}
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
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              alignItems: 'center',
                              fontSize: '12px',
                              width: '100%'
                            }}>
                              <div style={{ flex: 1, marginRight: '8px' }}>
                                {product.name}
                              </div>
                              <div style={{ 
                                fontSize: '11px', 
                                fontWeight: 'bold',
                                color: '#1890ff',
                                whiteSpace: 'nowrap'
                              }}>
                                {product.price ? `¥ ${product.price.toFixed(2)}` : 'Sob consulta'}
                              </div>
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
            rules={[
              { required: true, message: 'Por favor, insira o nome!' },
              { min: 2, message: 'O nome deve ter pelo menos 2 caracteres!' },
              { max: 100, message: 'O nome deve ter no máximo 100 caracteres!' }
            ]}
          >
            <Input 
              placeholder="Digite o nome da fábrica/loja" 
              maxLength={100}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="contact"
            label="Contato"
            rules={[
              { required: true, message: 'Por favor, insira o contato!' },
              { min: 8, message: 'O contato deve ter pelo menos 8 caracteres!' },
              { max: 50, message: 'O contato deve ter no máximo 50 caracteres!' }
            ]}
          >
            <Input 
              placeholder="Digite o contato (telefone, email, etc.)" 
              maxLength={50}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="location"
            label="Localização"
            rules={[
              { required: true, message: 'Por favor, insira a localização!' },
              { min: 5, message: 'A localização deve ter pelo menos 5 caracteres!' },
              { max: 200, message: 'A localização deve ter no máximo 200 caracteres!' }
            ]}
          >
            <Input 
              placeholder="Digite a localização completa" 
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="segment"
            label="Segmento"
            rules={[
              { required: true, message: 'Por favor, insira o segmento!' },
              { min: 2, message: 'O segmento deve ter pelo menos 2 caracteres!' },
              { max: 50, message: 'O segmento deve ter no máximo 50 caracteres!' }
            ]}
          >
            <Input 
              placeholder="Ex: Eletrônicos, Têxtil, Brinquedos, etc." 
              maxLength={50}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="observations"
            label="Observações"
            rules={[
              { max: 500, message: 'As observações devem ter no máximo 500 caracteres!' }
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Digite observações adicionais"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <div className="mobile-buttons">
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                loading={submitting}
                disabled={submitting}
              >
                {editingFactory ? 'Atualizar' : 'Criar'}
              </Button>
              <Button 
                onClick={() => setModalVisible(false)} 
                size="large"
                disabled={submitting}
              >
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
