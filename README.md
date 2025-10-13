# ProdMori - Sistema de Gestão de Produtos para China

Sistema completo de gestão de produtos e fábricas otimizado para funcionar na China, com backend que faz ponte entre frontend e Firestore usando Firebase Admin SDK.

## 🌟 Características

- ✅ **Compatível com China**: Sem chamadas diretas ao Firebase Web SDK
- ✅ **Backend Otimizado**: Firebase Admin SDK com cache agressivo
- ✅ **Frontend Moderno**: React com Bootstrap
- ✅ **Upload de Imagens**: Sistema FTP integrado
- ✅ **Deploy Vercel**: Pronto para produção
- ✅ **Cache Inteligente**: Otimizado para performance na China

## 🚀 Funcionalidades

### Dashboard
- Estatísticas em tempo real
- Visão geral de fábricas e produtos
- Acesso rápido às funcionalidades

### Gestão de Fábricas
- Cadastro completo de fábricas
- Informações de contato e segmento
- Listagem com filtros

### Gestão de Produtos
- Cadastro de produtos com imagens
- Associação com fábricas
- Preços e descrições detalhadas

### Sistema de Imagens
- Upload via FTP
- Cache inteligente
- Proxy para otimização

## 🛠️ Tecnologias

- **Frontend**: React 18, Bootstrap 5, React Router
- **Backend**: Node.js, Express, Firebase Admin SDK
- **Banco**: Firebase Firestore
- **Upload**: FTP + Proxy
- **Deploy**: Vercel Functions
- **Cache**: CDN + Headers otimizados

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- Conta Firebase
- Conta Vercel (para deploy)

### Desenvolvimento Local

```bash
# Clone o repositório
git clone https://github.com/gustavo-devfull/ProdMori.git
cd ProdMori

# Instale as dependências
npm install

# Configure as variáveis de ambiente (opcional para desenvolvimento)
# Crie um arquivo .env com:
# FB_PROJECT_ID=loja-13939
# FB_CLIENT_EMAIL=your-service-account@loja-13939.iam.gserviceaccount.com
# FB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"

# Execute em modo desenvolvimento
npm run dev
```

### Deploy no Vercel

1. **Configure as variáveis de ambiente no Vercel:**
   - `FB_PROJECT_ID=loja-13939`
   - `FB_CLIENT_EMAIL=your-service-account@loja-13939.iam.gserviceaccount.com`
   - `FB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"`

2. **Deploy:**
```bash
vercel --prod
```

## 🔧 Configuração Firebase

### 1. Criar Service Account
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em "Project Settings" > "Service accounts"
4. Clique em "Generate new private key"
5. Baixe o arquivo JSON

### 2. Extrair Credenciais
Do arquivo JSON baixado, extraia:
- `project_id` → `FB_PROJECT_ID`
- `client_email` → `FB_CLIENT_EMAIL`
- `private_key` → `FB_PRIVATE_KEY` (substitua `\n` por `\\n`)

## 🌏 Otimizações para China

### Cache Agressivo
- **API**: 60s com stale-while-revalidate 600s
- **Imagens**: 300s com stale-while-revalidate 600s
- **Assets**: Cache longo (1 ano)

### CDN Próximo
- Região: Hong Kong/Singapore
- Headers otimizados
- Compressão automática

### Sem Bloqueios
- Frontend só acessa próprio domínio
- Backend faz ponte com Firestore
- Nenhuma chamada direta ao Google

## 📁 Estrutura do Projeto

```
ProdMori/
├── src/
│   ├── components/          # Componentes React
│   ├── pages/              # Páginas da aplicação
│   ├── services/           # Serviços de API
│   └── config/             # Configurações
├── api/                    # Vercel Functions
│   └── firestore/         # APIs do Firestore
├── server.js              # Servidor Express
├── vercel.json            # Configuração Vercel
└── package.json           # Dependências
```

## 🔌 APIs Disponíveis

### Produtos
- `GET /api/firestore/products-with-factory` - Produtos com fábrica
- `GET /api/firestore/products-by-factory/:id` - Produtos por fábrica
- `POST /api/firestore/create/products` - Criar produto
- `PUT /api/firestore/update/products/:id` - Atualizar produto
- `DELETE /api/firestore/delete/products/:id` - Deletar produto

### Fábricas
- `GET /api/firestore/get?col=factories` - Listar fábricas
- `GET /api/firestore/get/factories/:id` - Fábrica específica
- `POST /api/firestore/create/factories` - Criar fábrica
- `PUT /api/firestore/update/factories/:id` - Atualizar fábrica
- `DELETE /api/firestore/delete/factories/:id` - Deletar fábrica

### Imagens
- `POST /api/upload-image` - Upload de imagem
- `GET /api/image/:filename` - Servir imagem
- `DELETE /api/delete-image/:filename` - Deletar imagem

## 🧪 Testes

```bash
# Testar servidor local
npm run server:dev

# Testar APIs
curl http://localhost:3001/api/test
curl http://localhost:3001/api/firestore/get?col=products
```

## 📝 Scripts Disponíveis

- `npm start` - Inicia React em desenvolvimento
- `npm run build` - Build para produção
- `npm run server` - Inicia servidor Express
- `npm run server:dev` - Servidor com nodemon
- `npm run dev` - Executa frontend e backend juntos

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Autor

**Gustavo DevFull**
- GitHub: [@gustavo-devfull](https://github.com/gustavo-devfull)
- Projeto: [ProdMori](https://github.com/gustavo-devfull/ProdMori)

## 🙏 Agradecimentos

- Firebase pela plataforma
- Vercel pelo deploy
- React e Bootstrap pelas bibliotecas
- Comunidade open source