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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Creating tag in Firebase:', req.body);

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
    const { tagData, factoryId } = req.body;

    if (!tagData || !factoryId) {
      return res.status(400).json({ error: 'tagData and factoryId are required' });
    }

    // Criar documento da tag
    const tagRef = await db.collection('tags').add({
      ...tagData,
      factoryId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Tag created successfully:', tagRef.id);

    res.status(200).json({
      success: true,
      id: tagRef.id,
      message: 'Tag criada com sucesso'
    });

  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}
