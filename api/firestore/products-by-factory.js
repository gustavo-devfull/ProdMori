const { getProductsByFactory } = require('../firestore-utils');

module.exports = async (req, res) => {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  
  try {
    const { factoryId, limit = '100' } = req.query;
    
    if (!factoryId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Parâmetro "factoryId" é obrigatório' 
      });
    }
    
    const result = await getProductsByFactory(factoryId, limit);
    
    if (result.ok) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Erro na função products-by-factory:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};
