const { getCollectionData } = require('../firestore-utils');

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
    const { limit = '100' } = req.query;
    
    // Buscar produtos
    const productsResult = await getCollectionData('products', limit, 'createdAt', 'desc');
    
    if (!productsResult.ok) {
      return res.status(500).json(productsResult);
    }
    
    // Buscar todas as fábricas uma vez
    const factoriesResult = await getCollectionData('factories', 1000);
    const factoriesMap = {};
    if (factoriesResult.ok) {
      factoriesResult.data.forEach(factory => {
        factoriesMap[factory.id] = factory;
      });
    }
    
    // Para cada produto, associar informações da fábrica
    const productsWithFactory = productsResult.data.map(product => {
      const factory = product.factoryId ? factoriesMap[product.factoryId] : null;
      return { ...product, factory };
    });
    
    res.status(200).json({
      ok: true,
      count: productsWithFactory.length,
      data: productsWithFactory
    });
  } catch (error) {
    console.error('Erro na função products-with-factory:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
};
