import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider locale={ptBR}>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
