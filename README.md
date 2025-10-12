# Sistema de Produtos China

Sistema de gerenciamento de produtos e fábricas desenvolvido com React, Ant Design, Firebase e FTP.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gustavo-devfull/ProductMR)

## 🚀 Deploy no Vercel

### Configuração Automática
1. Acesse [Vercel](https://vercel.com)
2. Conecte sua conta GitHub
3. Importe o repositório `gustavo-devfull/ProductMR`
4. Configure as variáveis de ambiente:
   - `REACT_APP_API_URL`: `https://ideolog.ia.br`
5. Deploy automático! ✨

### Configuração Manual
```bash
# Clone o repositório
git clone https://github.com/gustavo-devfull/ProductMR.git

# Instale o Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 🛠 Tecnologias Utilizadas

- **React** - Framework frontend
- **Ant Design** - Biblioteca de componentes UI
- **Firebase Firestore** - Banco de dados NoSQL
- **FTP** - Armazenamento de imagens
- **Express.js** - Backend para proxy de imagens
- **React Router** - Roteamento
- **Vercel** - Deploy e hospedagem
- **JavaScript/JSX** - Linguagem de programação

## ✨ Funcionalidades

### 🏭 Fábricas/Lojas
- Cadastro de fábricas com nome, contato, localização e observações
- Campo de segmento para categorização
- Listagem em cards com informações detalhadas
- Edição e exclusão de fábricas
- Exibição dos produtos associados a cada fábrica

### 📦 Produtos
- Cadastro de produtos com foto, nome, segmento, medidas, preço, MOQ e observações
- Upload de imagens via FTP
- Listagem em cards com foto, nome, preço e fábrica associada
- Filtro por fábrica
- Edição e exclusão de produtos
- Imagens responsivas (100% largura do card)

### 📊 Dashboard
- Estatísticas de fábricas e produtos
- Navegação rápida para cadastros
- Cards clicáveis para navegação
- Layout responsivo

## 🚀 Instalação Local

### Pré-requisitos
- Node.js (versão 14 ou superior)
- npm ou yarn
- Acesso ao Firebase
- Credenciais FTP

### Instalação
```bash
# Clone o repositório
git clone https://github.com/gustavo-devfull/ProductMR.git

# Instale as dependências
npm install

# Instale as dependências do servidor
npm install --prefix server
```

### Execução
```bash
# Desenvolvimento (frontend + backend)
npm run dev

# Apenas frontend
npm start

# Apenas backend
npm run server

# Build para produção
npm run build
```

## ⚙️ Configuração

### Firebase
Configure as credenciais do Firebase em `src/config/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCsgETTEl2bWeCAaAosdwAT5FfUvnWJydY",
  authDomain: "loja-13939.firebaseapp.com",
  projectId: "loja-13939",
  storageBucket: "loja-13939.firebasestorage.app",
  messagingSenderId: "803150163726",
  appId: "1:803150163726:web:86d7d8049f74d6bf94b15f"
};
```

### FTP
Configure as credenciais FTP em `server.js`:

```javascript
const ftpConfig = {
  host: '46.202.90.62',
  port: 21,
  user: 'u715606397.ideolog.ia.br',
  password: ']X9CC>t~ihWhdzNq'
};
```

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
│   ├── AppHeader.js     # Cabeçalho da aplicação
│   ├── AppSidebar.js    # Barra lateral de navegação
│   └── ErrorBoundary.js # Captura de erros
├── pages/              # Páginas da aplicação
│   ├── Dashboard.js    # Página inicial
│   ├── Factories.js    # Gerenciamento de fábricas
│   └── Products.js     # Gerenciamento de produtos
├── services/           # Serviços de API
│   ├── factoryService.js
│   ├── productService.js
│   ├── imageService.js
│   └── ftpService.js
├── config/             # Configurações
│   └── firebase.js
├── App.js              # Componente principal
├── index.js            # Ponto de entrada
└── index.css           # Estilos globais

server.js               # Servidor Express para proxy FTP
vercel.json             # Configuração do Vercel
config-overrides.js     # Configurações do webpack
package.json            # Dependências do projeto
```

## 🌐 Deploy

### Vercel (Recomendado)
- ✅ Deploy automático via GitHub
- ✅ CDN global
- ✅ SSL automático
- ✅ Preview de branches
- ✅ Configuração em `vercel.json`

### Outras Plataformas
- **Netlify**: Compatível com React
- **Heroku**: Requer configuração adicional
- **AWS S3 + CloudFront**: Para usuários avançados

## 📱 Responsividade

- **Mobile**: Drawer para navegação, cards otimizados
- **Tablet**: Layout adaptativo
- **Desktop**: Sidebar fixa, layout completo

## 🔧 Melhorias Implementadas

- ✅ Imagens responsivas (100% largura do card)
- ✅ Layout responsivo completo
- ✅ Error Boundary para captura de erros
- ✅ Configurações otimizadas do webpack
- ✅ Meta tag anti-tradução para estabilidade
- ✅ Botões com padding aumentado (16px 32px)
- ✅ Filtro por fábrica na página de produtos
- ✅ Cards com informações detalhadas
- ✅ Navegação otimizada para mobile
- ✅ Deploy configurado para Vercel

## 📄 Licença

Este projeto é privado e destinado ao uso interno.

## 🤝 Contribuição

Para contribuir com o projeto:
1. Fork o repositório
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📞 Suporte

Para suporte técnico, entre em contato através do GitHub Issues.