const { deleteDocument } = require('../../firestore-utils');

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
    // Extrair collection e id da URL
    const urlParts = req.url.split('/');
    const collection = urlParts[urlParts.length - 2]; // penúltimo segmento
    const id = urlParts[urlParts.length - 1]; // último segmento
    
    if (!collection || !id) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Collection e ID são obrigatórios' 
      });
    }
    
    const result = await deleteDocument(collection, id);
    
    if (result.ok) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Erro na função delete document:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};
