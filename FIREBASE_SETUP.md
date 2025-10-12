# Configuração do Firebase Storage

## ⚠️ IMPORTANTE: Configuração Necessária

Para resolver o problema de CORS no Firebase Storage, você precisa configurar as regras de segurança no Firebase Console.

### 📋 Passos para Configurar:

1. **Acesse o Firebase Console**
   - Vá para: https://console.firebase.google.com/
   - Selecione o projeto: `loja-13939`

2. **Configure Storage Rules**
   - No menu lateral, clique em "Storage"
   - Clique na aba "Rules"
   - Substitua as regras existentes por:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Permitir leitura e escrita para todos os usuários
    // Em produção, implemente autenticação adequada
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

3. **Publique as Regras**
   - Clique em "Publish" para aplicar as mudanças

### 🔧 Alternativa: Usando Firebase CLI

Se você tiver o Firebase CLI instalado:

```bash
# Instalar Firebase CLI (se não tiver)
npm install -g firebase-tools

# Login no Firebase
firebase login

# Inicializar projeto (se necessário)
firebase init storage

# Deploy das regras
firebase deploy --only storage
```

### 🚨 Nota de Segurança

As regras atuais permitem acesso público ao Storage. Para produção, implemente autenticação adequada:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{fileName} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### ✅ Verificação

Após configurar as regras:
1. Reinicie o servidor de desenvolvimento: `npm start`
2. Teste o upload de uma imagem
3. Verifique se não há mais erros de CORS no console

### 📞 Suporte

Se ainda houver problemas:
- Verifique se o projeto Firebase está ativo
- Confirme se o Storage está habilitado
- Verifique as regras de segurança
- Teste com uma imagem pequena (< 1MB)

