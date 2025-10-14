const { deleteDocument } = require('../firestore-utils');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { collection, id } = req.body;
    
    if (!collection || !id) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Parâmetros "collection" e "id" são obrigatórios' 
      });
    }
    
    const result = await deleteDocument(collection, id);
    
    if (result.ok) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Erro na função delete:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};
