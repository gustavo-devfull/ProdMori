const { getCollectionData } = require('./firestore-utils');

export default async function handler(req, res) {
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
    const { col = 'products', limit = '20', orderBy: orderField = 'createdAt', orderDirection = 'desc' } = req.query;
    
    const result = await getCollectionData(col, limit, orderField, orderDirection);
    
    if (result.ok) {
      // Cache agressivo para China
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    console.error('Erro na função get:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
}
