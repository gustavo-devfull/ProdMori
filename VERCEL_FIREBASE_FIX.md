# 🔧 Configuração Firebase no Vercel - Erro 500 Resolvido

## ❌ Problema Identificado
**Erro**: `FUNCTION_INVOCATION_FAILED` - APIs do Firestore retornando erro 500

**Causa**: Firebase Admin SDK não configurado no Vercel (variáveis de ambiente ausentes)

## 🛠️ Correções Implementadas

### 1. **Corrigido firestore-utils.js**
- ✅ Adicionado tratamento robusto de inicialização do Firebase
- ✅ Verificação de credenciais antes de inicializar
- ✅ Fallback quando credenciais não estão disponíveis
- ✅ Verificações de segurança em todas as funções

### 2. **Tratamento de Erro Melhorado**
```javascript
// ✅ ANTES: Quebrava sem credenciais
admin.initializeApp({ credential: ... }); // ❌ Erro se credenciais ausentes

// ✅ AGORA: Tratamento robusto
if (process.env.FB_CLIENT_EMAIL && process.env.FB_PRIVATE_KEY) {
  admin.initializeApp({ credential: ... });
} else {
  console.log('Firebase Admin SDK não inicializado - credenciais não encontradas');
}
```

### 3. **Verificações de Segurança**
```javascript
async function getCollection(req, res) {
  try {
    if (!db) {
      return res.status(503).json({ 
        ok: false, 
        error: 'Firebase Admin SDK não configurado. Configure as variáveis FB_CLIENT_EMAIL e FB_PRIVATE_KEY.' 
      });
    }
    // ... resto da função
  }
}
```

## 🔧 Como Configurar Firebase no Vercel

### **Passo 1: Criar Service Account**
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto (`loja-13939`)
3. Vá em **Project Settings** > **Service accounts**
4. Clique em **Generate new private key**
5. Baixe o arquivo JSON

### **Passo 2: Extrair Credenciais**
Do arquivo JSON baixado, extraia:
```json
{
  "project_id": "loja-13939",
  "client_email": "firebase-adminsdk-xxxxx@loja-13939.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
}
```

### **Passo 3: Configurar no Vercel**

#### **Via Dashboard Vercel:**
1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecione seu projeto `prod-mori`
3. Vá em **Settings** > **Environment Variables**
4. Adicione as variáveis:

| Nome | Valor |
|------|-------|
| `FB_PROJECT_ID` | `loja-13939` |
| `FB_CLIENT_EMAIL` | `firebase-adminsdk-xxxxx@loja-13939.iam.gserviceaccount.com` |
| `FB_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n` |

#### **Via CLI:**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Adicionar variáveis
vercel env add FB_PROJECT_ID
vercel env add FB_CLIENT_EMAIL  
vercel env add FB_PRIVATE_KEY

# Deploy
vercel --prod
```

### **Passo 4: Deploy**
```bash
# Fazer novo deploy para aplicar as variáveis
vercel --prod
```

## 🧪 Testando a Configuração

### **Antes da Configuração:**
```bash
curl https://prod-mori.vercel.app/api/firestore/get?col=factories
# Resposta: {"ok":false,"error":"Firebase Admin SDK não configurado..."}
```

### **Depois da Configuração:**
```bash
curl https://prod-mori.vercel.app/api/firestore/get?col=factories
# Resposta: {"ok":true,"count":0,"data":[],"collection":"factories"}
```

## 📊 Status das APIs

### ✅ **APIs Funcionando (sem Firebase)**
- `GET /api/test` - ✅ Funcionando
- `POST /api/upload-image` - ✅ Funcionando
- `GET /api/image/:filename` - ✅ Funcionando

### ⚠️ **APIs Aguardando Firebase**
- `GET /api/firestore/get` - ⚠️ Erro 503 (sem credenciais)
- `GET /api/firestore/products-with-factory` - ⚠️ Erro 503 (sem credenciais)
- `POST /api/firestore/create/:collection` - ⚠️ Erro 503 (sem credenciais)
- `PUT /api/firestore/update/:collection/:id` - ⚠️ Erro 503 (sem credenciais)
- `DELETE /api/firestore/delete/:collection/:id` - ⚠️ Erro 503 (sem credenciais)

## 🚀 Próximos Passos

1. ✅ **Correção implementada** - Vercel Functions não quebram mais
2. 🔧 **Configurar Firebase** - Adicionar variáveis de ambiente
3. 🚀 **Deploy** - Aplicar configurações
4. 🧪 **Testar APIs** - Verificar funcionamento completo
5. 📊 **Monitorar** - Verificar logs e performance

## 🎯 Resultado Final

Após configurar as variáveis de ambiente:
- ✅ **APIs funcionando** - Todas as rotas do Firestore operacionais
- ✅ **Frontend funcionando** - Dashboard carregando dados
- ✅ **Sistema completo** - Pronto para uso na China
- ✅ **Performance otimizada** - Cache e CDN configurados

## 🔍 Debug

### **Verificar Logs do Vercel:**
```bash
vercel logs
```

### **Verificar Variáveis:**
```bash
vercel env ls
```

### **Testar Localmente:**
```bash
# Configurar variáveis locais
export FB_PROJECT_ID=loja-13939
export FB_CLIENT_EMAIL=your-service-account@loja-13939.iam.gserviceaccount.com
export FB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"

# Testar
npm run dev
```
