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

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Updating tag in Firebase:', req.body);

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
    const { tagId, tagData } = req.body;

    if (!tagId || !tagData) {
      return res.status(400).json({ error: 'tagId and tagData are required' });
    }

    // Atualizar documento da tag
    await db.collection('tags').doc(tagId).update({
      ...tagData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Tag updated successfully:', tagId);

    res.status(200).json({
      success: true,
      message: 'Tag atualizada com sucesso'
    });

  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}
