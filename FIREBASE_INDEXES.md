# Firebase Firestore Indexes

## Índices Necessários

### 1. Produtos por Fábrica
Se você quiser usar `orderBy` junto com `where` na consulta de produtos por fábrica, será necessário criar um índice composto:

**Coleção**: `products`
**Campos**:
- `factoryId` (Ascending)
- `createdAt` (Descending)

### Como Criar o Índice

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto `loja-13939`
3. Vá para **Firestore Database**
4. Clique em **Indexes**
5. Clique em **Create Index**
6. Configure:
   - **Collection ID**: `products`
   - **Fields**:
     - `factoryId` - Ascending
     - `createdAt` - Descending

### Alternativa Implementada

Para evitar a necessidade de criar índices, implementamos uma solução que:
1. Busca os produtos usando apenas `where('factoryId', '==', factoryId)`
2. Ordena os resultados localmente usando JavaScript

Esta abordagem é mais simples e não requer configuração adicional no Firebase.

## Consultas Atuais

### Produtos por Fábrica
```javascript
// Consulta simples (sem orderBy)
const q = query(
  collection(db, 'products'), 
  where('factoryId', '==', factoryId)
);

// Ordenação local
products.sort((a, b) => {
  if (a.createdAt && b.createdAt) {
    return b.createdAt.toDate() - a.createdAt.toDate();
  }
  return 0;
});
```

### Todos os Produtos
```javascript
// Consulta com orderBy (funciona sem índice adicional)
const q = query(
  collection(db, 'products'), 
  orderBy('createdAt', 'desc')
);
```

## Benefícios da Solução Atual

- ✅ **Sem Configuração**: Não precisa criar índices no Firebase
- ✅ **Funcionamento Imediato**: Consultas funcionam instantaneamente
- ✅ **Flexibilidade**: Ordenação pode ser ajustada facilmente
- ✅ **Performance**: Para pequenas quantidades de dados, a ordenação local é eficiente


