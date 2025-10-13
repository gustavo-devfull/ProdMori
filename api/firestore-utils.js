const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FB_PROJECT_ID || "loja-13939",
      clientEmail: process.env.FB_CLIENT_EMAIL,
      privateKey: process.env.FB_PRIVATE_KEY ? process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

const db = admin.firestore();

// Função para buscar dados de uma coleção
async function getCollection(req, res) {
  try {
    const { col = 'products', limit = '20', orderBy: orderField = 'createdAt', orderDirection = 'desc' } = req.query;
    
    let query = db.collection(String(col));
    
    // Aplicar ordenação
    if (orderField) {
      query = query.orderBy(orderField, orderDirection);
    }
    
    // Aplicar limite
    if (limit) {
      query = query.limit(Number(limit));
    }
    
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Cache agressivo para China
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    
    res.status(200).json({ 
      ok: true, 
      count: data.length, 
      data,
      collection: col 
    });
  } catch (error) {
    console.error('Erro ao buscar dados do Firestore:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
}

// Função para buscar um documento específico
async function getDocument(req, res) {
  try {
    const { collection, id } = req.query;
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Documento não encontrado' 
      });
    }
    
    const data = { id: doc.id, ...doc.data() };
    
    // Cache moderado para documentos individuais
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    
    res.status(200).json({ 
      ok: true, 
      data 
    });
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
}

// Função para criar um documento
async function createDocument(req, res) {
  try {
    const { collection } = req.query;
    const data = req.body;
    
    // Adicionar timestamps
    const docData = {
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection(collection).add(docData);
    
    res.status(201).json({ 
      ok: true, 
      id: docRef.id,
      message: 'Documento criado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar documento:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
}

// Função para atualizar um documento
async function updateDocument(req, res) {
  try {
    const { collection, id } = req.query;
    const data = req.body;
    
    // Adicionar timestamp de atualização
    const updateData = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = db.collection(collection).doc(id);
    await docRef.update(updateData);
    
    res.status(200).json({ 
      ok: true, 
      message: 'Documento atualizado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
}

// Função para deletar um documento
async function deleteDocument(req, res) {
  try {
    const { collection, id } = req.query;
    await db.collection(collection).doc(id).delete();
    
    res.status(200).json({ 
      ok: true, 
      message: 'Documento deletado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
}

// Função para buscar produtos com informações da fábrica
async function getProductsWithFactory(req, res) {
  try {
    const { limit = '20' } = req.query;
    
    // Buscar produtos
    const productsSnapshot = await db.collection('products')
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .get();
    
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Carregar informações da fábrica para cada produto
    const productsWithFactory = await Promise.all(
      products.map(async (product) => {
        if (product.factoryId) {
          try {
            const factoryDoc = await db.collection('factories').doc(product.factoryId).get();
            if (factoryDoc.exists) {
              return { 
                ...product, 
                factory: { id: factoryDoc.id, ...factoryDoc.data() } 
              };
            }
          } catch (err) {
            console.error(`Erro ao carregar fábrica para produto ${product.name}:`, err);
          }
        }
        return { ...product, factory: null };
      })
    );
    
    // Cache agressivo para China
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    
    res.status(200).json({ 
      ok: true, 
      count: productsWithFactory.length, 
      data: productsWithFactory 
    });
  } catch (error) {
    console.error('Erro ao buscar produtos com fábrica:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
}

// Função para buscar produtos de uma fábrica específica
async function getProductsByFactory(req, res) {
  try {
    const { factoryId } = req.query;
    const { limit = '20' } = req.query;
    
    const productsSnapshot = await db.collection('products')
      .where('factoryId', '==', factoryId)
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .get();
    
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Cache moderado
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    
    res.status(200).json({ 
      ok: true, 
      count: products.length, 
      data: products,
      factoryId 
    });
  } catch (error) {
    console.error('Erro ao buscar produtos da fábrica:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
}

module.exports = {
  getCollection,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getProductsWithFactory,
  getProductsByFactory
};
