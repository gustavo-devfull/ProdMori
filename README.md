# Sistema de Produtos China

Sistema completo para gerenciamento de produtos e fábricas/lojas chinesas, desenvolvido em React com Firebase e FTP para armazenamento de imagens.

## 🚀 Funcionalidades

### Fábricas/Lojas
- ✅ Cadastro completo com nome, contato, localização e observações
- ✅ Listagem com paginação e busca
- ✅ Edição e exclusão de registros
- ✅ Interface intuitiva com Ant Design

### Produtos
- ✅ Cadastro com foto, nome, segmento, medidas, preço, MOQ e observações
- ✅ Upload de imagens via FTP
- ✅ Associação com fábricas/lojas
- ✅ Listagem com preview de imagens
- ✅ Edição e exclusão de produtos

### Dashboard
- ✅ Estatísticas gerais do sistema
- ✅ Contadores de fábricas e produtos
- ✅ Interface responsiva

## 🛠️ Tecnologias Utilizadas

- **React 18** - Framework frontend
- **Ant Design 5** - Biblioteca de componentes UI
- **Firebase Firestore** - Banco de dados NoSQL
- **Express.js** - Servidor backend
- **FTP** - Armazenamento de imagens via servidor
- **React Router** - Navegação entre páginas

## 📦 Instalação

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd produtos-china
```

2. **Instale as dependências**
```bash
npm install
```

3. **Execute o projeto**
O sistema possui frontend e backend integrados:

**Opção 1 - Executar tudo junto (recomendado):**
```bash
npm run dev
```

**Opção 2 - Executar separadamente:**
```bash
# Terminal 1 - Backend (FTP)
npm run server

# Terminal 2 - Frontend
npm start
```

O sistema estará disponível em:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`

## 🗂️ Estrutura do Projeto

```
PMR/
├── src/                    # Frontend React
│   ├── components/         # Componentes reutilizáveis
│   │   ├── AppHeader.js   # Cabeçalho da aplicação
│   │   └── AppSidebar.js  # Menu lateral
│   ├── config/            # Configurações
│   │   └── firebase.js    # Configuração do Firebase
│   ├── pages/             # Páginas principais
│   │   ├── Dashboard.js   # Página inicial
│   │   ├── Factories.js   # Gerenciamento de fábricas
│   │   └── Products.js    # Gerenciamento de produtos
│   ├── services/          # Serviços de API
│   │   ├── factoryService.js  # CRUD de fábricas
│   │   ├── productService.js  # CRUD de produtos
│   │   └── imageService.js    # Upload/download via API
│   ├── App.js             # Componente principal
│   ├── index.js           # Ponto de entrada
│   └── index.css          # Estilos globais
├── server.js              # Servidor backend Express
├── package.json           # Dependências do projeto
└── README.md              # Documentação
```

## 🔧 Configurações

### Firebase
O Firebase está configurado com:
- **Projeto**: loja-13939
- **Firestore**: Para armazenamento de dados
- **Storage**: Para backup de imagens

### FTP
O FTP está configurado com:
- **Host**: 46.202.90.62
- **Porta**: 21
- **Domínio**: ideolog.ia.br
- **Upload**: Imagens são salvas via servidor backend
- **URLs**: Imagens acessíveis via http://ideolog.ia.br/

## 📱 Como Usar

### 1. Cadastrar Fábrica/Loja
1. Acesse "Fábricas/Lojas" no menu
2. Clique em "Nova Fábrica/Loja"
3. Preencha os dados obrigatórios
4. Salve o registro

### 2. Cadastrar Produto
1. Acesse "Produtos" no menu
2. Clique em "Novo Produto"
3. Faça upload da imagem do produto
4. Preencha todos os dados
5. Selecione a fábrica associada
6. Salve o produto

### 3. Visualizar Dashboard
1. Acesse a página inicial
2. Veja as estatísticas gerais
3. Monitore o crescimento do sistema

## 🔒 Segurança

- Todas as operações são validadas no frontend
- Imagens são armazenadas com nomes únicos
- Firebase Firestore com regras de segurança
- FTP com credenciais seguras

## 🚀 Deploy

Para fazer deploy em produção:

1. **Build do projeto**
```bash
npm run build
```

2. **Configure o servidor**
- Configure um servidor web (Nginx, Apache)
- Aponte para a pasta `build/`
- Configure HTTPS para segurança

3. **Variáveis de ambiente**
- Mantenha as credenciais seguras
- Configure CORS no Firebase se necessário

## 📞 Suporte

Para dúvidas ou problemas:
- Verifique os logs do console do navegador
- Confirme as credenciais do Firebase e FTP
- Teste a conectividade de rede

## 🔄 Atualizações Futuras

- [ ] Sistema de autenticação
- [ ] Relatórios avançados
- [ ] Exportação de dados
- [ ] Notificações push
- [ ] API REST para integração
