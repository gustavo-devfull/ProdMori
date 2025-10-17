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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tagId, tagName, tagDivision, factoryId } = req.body;

    // Validar dados obrigatórios
    if (!tagId || !tagName || !tagDivision || !factoryId) {
      return res.status(400).json({ 
        error: 'Dados obrigatórios: tagId, tagName, tagDivision, factoryId' 
      });
    }

    // Verificar se já existe uma associação para esta tag e fábrica
    const existingAssociation = await db.collection('tag-associations')
      .where('tagId', '==', tagId)
      .where('factoryId', '==', factoryId)
      .get();

    if (!existingAssociation.empty) {
      return res.status(200).json({ 
        success: true, 
        message: 'Associação já existe',
        id: existingAssociation.docs[0].id
      });
    }

    // Criar nova associação
    const associationData = {
      tagId,
      tagName,
      tagDivision,
      factoryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('tag-associations').add(associationData);

    console.log('Tag association created:', docRef.id);

    res.status(200).json({
      success: true,
      message: 'Associação criada com sucesso',
      id: docRef.id,
      data: associationData
    });

  } catch (error) {
    console.error('Error creating tag association:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};
