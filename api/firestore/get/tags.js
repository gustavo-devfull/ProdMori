const admin = require('firebase-admin');

export default async function handler(req, res) {
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
    console.log('Getting tags from Firebase');

    if (!admin.apps.length) {
      // Inicializar Firebase Admin SDK se não estiver inicializado
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FB_PROJECT_ID || "loja-13939",
          clientEmail: process.env.FB_CLIENT_EMAIL,
          privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }

    const db = admin.firestore();
    const { factoryId, division } = req.query;

    let query = db.collection('tags');

    // Filtrar por fábrica se especificado
    if (factoryId) {
      query = query.where('factoryId', '==', factoryId);
    }

    // Filtrar por divisão se especificado
    if (division) {
      query = query.where('division', '==', division);
    }

    // Ordenar por data de criação
    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const tags = [];

    snapshot.forEach(doc => {
      tags.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`Found ${tags.length} tags`);

    res.status(200).json({
      success: true,
      data: tags,
      count: tags.length
    });

  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}
