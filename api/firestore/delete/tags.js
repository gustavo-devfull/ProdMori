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

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Deleting tag from Firebase:', req.body);

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
    const { tagId } = req.body;

    if (!tagId) {
      return res.status(400).json({ error: 'tagId is required' });
    }

    // Deletar documento da tag
    await db.collection('tags').doc(tagId).delete();

    console.log('Tag deleted successfully:', tagId);

    res.status(200).json({
      success: true,
      message: 'Tag deletada com sucesso'
    });

  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}
