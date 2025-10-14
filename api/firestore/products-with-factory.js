const { getCollectionData } = require('../firestore-utils');

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
    const { limit = '100' } = req.query;
    
    // Buscar produtos
    const productsResult = await getCollectionData('products', limit, 'createdAt', 'desc');
    
    if (!productsResult.ok) {
      return res.status(500).json(productsResult);
    }
    
    // Para cada produto, buscar informações da fábrica
    const productsWithFactory = await Promise.all(
      productsResult.data.map(async (product) => {
        if (product.factoryId) {
          try {
            const factoryResult = await getCollectionData('factories', 1);
            if (factoryResult.ok && factoryResult.data.length > 0) {
              const factory = factoryResult.data.find(f => f.id === product.factoryId);
              return { ...product, factory: factory || null };
            }
          } catch (err) {
            console.error(`Erro ao carregar fábrica para produto ${product.name}:`, err);
          }
        }
        return { ...product, factory: null };
      })
    );
    
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
