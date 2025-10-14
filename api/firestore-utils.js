const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK se não estiver inicializado
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FB_PROJECT_ID,
        clientEmail: process.env.FB_CLIENT_EMAIL,
        privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin SDK:', error);
  }
}

const db = admin.firestore();

// Função para buscar dados de uma coleção
async function getCollectionData(collection, limit = 20, orderBy = 'createdAt', orderDirection = 'desc') {
  try {
    let query = db.collection(collection);
    
    // Aplicar ordenação
    if (orderBy) {
      query = query.orderBy(orderBy, orderDirection);
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
    
    return { ok: true, count: data.length, data, collection };
  } catch (error) {
    console.error('Erro ao buscar dados do Firestore:', error);
    return { ok: false, error: error.message || 'Erro interno do servidor' };
  }
}

// Função para buscar um documento específico
async function getDocument(collection, id) {
  try {
    const doc = await db.collection(collection).doc(id).get();
    
    if (!doc.exists) {
      return { ok: false, error: 'Documento não encontrado' };
    }
    
    return { ok: true, data: { id: doc.id, ...doc.data() } };
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    return { ok: false, error: error.message || 'Erro interno do servidor' };
  }
}

// Função para criar um documento
async function createDocument(collection, data) {
  try {
    const docRef = await db.collection(collection).add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { ok: true, id: docRef.id, message: 'Documento criado com sucesso' };
  } catch (error) {
    console.error('Erro ao criar documento:', error);
    return { ok: false, error: error.message || 'Erro interno do servidor' };
  }
}

// Função para atualizar um documento
async function updateDocument(collection, id, data) {
  try {
    await db.collection(collection).doc(id).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { ok: true, message: 'Documento atualizado com sucesso' };
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    return { ok: false, error: error.message || 'Erro interno do servidor' };
  }
}

// Função para deletar um documento
async function deleteDocument(collection, id) {
  try {
    await db.collection(collection).doc(id).delete();
    
    return { ok: true, message: 'Documento deletado com sucesso' };
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    return { ok: false, error: error.message || 'Erro interno do servidor' };
  }
}

// Função para buscar produtos por fábrica
async function getProductsByFactory(factoryId, limit = 100) {
  try {
    let query = db.collection('products').where('factoryId', '==', factoryId);
    
    // Aplicar limite
    if (limit) {
      query = query.limit(Number(limit));
    }
    
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { ok: true, count: data.length, data };
  } catch (error) {
    console.error('Erro ao buscar produtos por fábrica:', error);
    return { ok: false, error: error.message || 'Erro interno do servidor' };
  }
}

module.exports = {
  getCollectionData,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getProductsByFactory
};
