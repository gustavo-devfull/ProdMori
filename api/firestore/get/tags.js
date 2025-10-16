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
    console.log('Firebase environment variables:', {
      FB_PROJECT_ID: process.env.FB_PROJECT_ID ? 'SET' : 'NOT SET',
      FB_CLIENT_EMAIL: process.env.FB_CLIENT_EMAIL ? 'SET' : 'NOT SET',
      FB_PRIVATE_KEY: process.env.FB_PRIVATE_KEY ? 'SET' : 'NOT SET'
    });

    if (!admin.apps.length) {
      // Verificar se as credenciais estão disponíveis
      if (!process.env.FB_CLIENT_EMAIL || !process.env.FB_PRIVATE_KEY) {
        console.error('Firebase credentials not found in environment variables');
        return res.status(500).json({ 
          error: 'Firebase credentials not configured',
          details: 'FB_CLIENT_EMAIL and FB_PRIVATE_KEY must be set in environment variables'
        });
      }

      // Inicializar Firebase Admin SDK se não estiver inicializado
      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FB_PROJECT_ID || "loja-13939",
            clientEmail: process.env.FB_CLIENT_EMAIL,
            privateKey: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
        console.log('Firebase Admin SDK initialized successfully');
      } catch (initError) {
        console.error('Error initializing Firebase Admin SDK:', initError);
        return res.status(500).json({ 
          error: 'Failed to initialize Firebase',
          details: initError.message
        });
      }
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
