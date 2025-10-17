const admin = require('firebase-admin');

// Inicializar Firebase Admin se ainda não foi inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
}

const db = admin.firestore();

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { factoryId } = req.query;

    let query = db.collection('tag-associations');

    // Se factoryId foi fornecido, filtrar por fábrica
    if (factoryId) {
      query = query.where('factoryId', '==', factoryId);
    }

    const snapshot = await query.get();

    const associations = [];
    snapshot.forEach(doc => {
      associations.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`Found ${associations.length} tag associations`);

    res.status(200).json({
      success: true,
      data: associations,
      count: associations.length
    });

  } catch (error) {
    console.error('Error getting tag associations:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};
