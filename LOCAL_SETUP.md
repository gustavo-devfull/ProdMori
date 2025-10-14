# 🔧 Configuração do Ambiente Local

## ❌ Problema Identificado
O sistema local na porta 3000 está com erro ao carregar dados porque o Firebase Admin SDK não está configurado.

## 🛠️ Solução

### **Passo 1: Criar arquivo .env**
Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```bash
# Firebase Admin SDK Configuration
FB_PROJECT_ID=loja-13939
FB_CLIENT_EMAIL=firebase-adminsdk-xxxxx@loja-13939.iam.gserviceaccount.com
FB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# API Configuration
REACT_APP_API_URL=http://localhost:3001
```

### **Passo 2: Obter Credenciais do Firebase**
1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: `loja-13939`
3. Vá em **Project Settings** > **Service accounts**
4. Clique em **"Generate new private key"**
5. Baixe o arquivo JSON
6. Extraia os valores:
   - `project_id` → `FB_PROJECT_ID`
   - `client_email` → `FB_CLIENT_EMAIL`
   - `private_key` → `FB_PRIVATE_KEY`

### **Passo 3: Configurar o arquivo .env**
Substitua os valores `xxxxx` pelos valores reais do arquivo JSON.

### **Passo 4: Reiniciar o servidor**
```bash
# Parar processos atuais
pkill -f "react-scripts"
pkill -f "node server.js"

# Iniciar com configuração completa
npm run dev
```

## 🧪 Testando

### **Verificar se está funcionando:**
```bash
# Testar API
curl http://localhost:3001/api/test
# Deve retornar: {"message":"API funcionando!"}

# Testar Firestore
curl "http://localhost:3001/api/firestore/get?collection=factories"
# Deve retornar dados ou array vazio (não erro 503)
```

## 🚀 Alternativa Temporária

Se você não tiver acesso às credenciais do Firebase, pode usar apenas o frontend:

```bash
# Apenas o React (sem APIs)
npm start
```

**Limitação**: Não será possível criar/editar/deletar dados, apenas visualizar o que já existe.

## 📞 Suporte

Se ainda houver problemas:
1. Verifique se o arquivo `.env` está na raiz do projeto
2. Confirme se as credenciais estão corretas
3. Verifique se não há espaços extras nas variáveis
4. Reinicie completamente o terminal e tente novamente
