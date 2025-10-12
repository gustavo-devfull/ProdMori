import React from 'react';
import { Layout, Menu, Drawer } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  DashboardOutlined, 
  ShopOutlined, 
  ShoppingOutlined 
} from '@ant-design/icons';

const { Sider } = Layout;

const AppSidebar = ({ collapsed, onCollapse, isMobile, visible, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/factories',
      icon: <ShopOutlined />,
      label: 'Fábricas/Lojas',
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: 'Produtos',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile) {
      onClose();
    }
  };

  const menuContent = (
    <>
      <div style={{ 
        height: '64px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <ShopOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ borderRight: 0 }}
      />
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        title="Menu"
        placement="left"
        onClose={onClose}
        open={visible}
        width={250}
        styles={{ body: { padding: 0 } }}
      >
        {menuContent}
      </Drawer>
    );
  }

  return (
    <Sider 
      width={250} 
      collapsed={collapsed}
      onCollapse={onCollapse}
      style={{ background: '#fff' }}
      breakpoint="lg"
      collapsedWidth="0"
    >
      {menuContent}
    </Sider>
  );
};

export default AppSidebar;
