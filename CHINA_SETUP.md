# Configuração para Funcionamento na China

## Problema
O Firebase Web SDK não funciona diretamente na China devido ao bloqueio do `firestore.googleapis.com`. A solução é usar um backend que faz a ponte entre o frontend e o Firestore usando Firebase Admin SDK.

## Solução Implementada

### 1. Backend com Firebase Admin SDK
- Criadas rotas de API no `server.js` que usam Firebase Admin SDK
- Todas as operações CRUD estão disponíveis via API REST
- Cache agressivo implementado para otimizar performance na China

### 2. Frontend Atualizado
- Criados novos serviços (`productServiceAPI.js`, `factoryServiceAPI.js`)
- Substituídas todas as chamadas diretas ao Firebase Web SDK por fetch para as APIs do backend
- Componentes atualizados para usar os novos serviços

### 3. Variáveis de Ambiente Necessárias

Configure as seguintes variáveis no Vercel ou no seu servidor:

```bash
FB_PROJECT_ID=loja-13939
FB_CLIENT_EMAIL=your-service-account@loja-13939.iam.gserviceaccount.com
FB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

### 4. Como Configurar as Variáveis

1. Acesse o Firebase Console (https://console.firebase.google.com/)
2. Selecione seu projeto (loja-13939)
3. Vá em "Project Settings" > "Service accounts"
4. Clique em "Generate new private key"
5. Baixe o arquivo JSON
6. Extraia os valores de:
   - `project_id` → `FB_PROJECT_ID`
   - `client_email` → `FB_CLIENT_EMAIL`
   - `private_key` → `FB_PRIVATE_KEY` (substitua `\n` por `\\n`)

### 5. Rotas de API Disponíveis

#### Produtos
- `GET /api/firestore/products-with-factory` - Buscar produtos com informações da fábrica
- `GET /api/firestore/products-by-factory/:factoryId` - Buscar produtos de uma fábrica
- `POST /api/firestore/create/products` - Criar produto
- `PUT /api/firestore/update/products/:id` - Atualizar produto
- `DELETE /api/firestore/delete/products/:id` - Deletar produto

#### Fábricas
- `GET /api/firestore/get?col=factories` - Buscar fábricas
- `GET /api/firestore/get/factories/:id` - Buscar fábrica específica
- `POST /api/firestore/create/factories` - Criar fábrica
- `PUT /api/firestore/update/factories/:id` - Atualizar fábrica
- `DELETE /api/firestore/delete/factories/:id` - Deletar fábrica

#### Genéricas
- `GET /api/firestore/get?col=COLLECTION` - Buscar qualquer coleção
- `GET /api/firestore/get/:collection/:id` - Buscar documento específico

### 6. Cache Implementado

- **Cache agressivo**: 60 segundos com stale-while-revalidate de 600 segundos
- **Headers otimizados**: `Cache-Control: public, s-maxage=60, stale-while-revalidate=600`
- **CDN friendly**: Todas as rotas são cacheáveis

### 7. Benefícios para China

1. **Sem bloqueios**: Frontend só acessa seu próprio domínio
2. **Performance**: Cache agressivo reduz chamadas ao Firestore
3. **CDN**: Pode usar CDN próximo à China (Hong Kong/Singapore)
4. **Confiabilidade**: Backend faz retry automático em caso de falhas

### 8. Testando

Para testar localmente:
```bash
npm run dev
```

Para testar as APIs:
```bash
curl http://localhost:3001/api/test
curl http://localhost:3001/api/firestore/get?col=products
```

### 9. Deploy

O sistema está pronto para deploy no Vercel. Certifique-se de:
1. Configurar as variáveis de ambiente no Vercel
2. O backend será executado como Vercel Functions
3. O frontend será servido via CDN do Vercel
