// Carregar variáveis de ambiente
require('dotenv').config();

const express = require('express');
const multer = require('multer');
const ftp = require('basic-ftp');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Inicializar Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Verificar se as credenciais estão disponíveis
    if (process.env.FB_CLIENT_EMAIL && process.env.FB_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FB_PROJECT_ID || "loja-13939",
          clientEmail: process.env.FB_CLIENT_EMAIL,
          privateKey: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase Admin SDK inicializado com credenciais');
    } else {
      console.log('Firebase Admin SDK não inicializado - credenciais não encontradas');
      console.log('Configure as variáveis FB_CLIENT_EMAIL e FB_PRIVATE_KEY para usar o Firestore');
    }
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin SDK:', error.message);
    console.log('Continuando sem Firebase Admin SDK...');
  }
}

const db = admin.apps.length > 0 ? admin.firestore() : null;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(file.originalname);
    cb(null, `product_${timestamp}_${randomString}${extension}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'), false);
    }
  }
});

// Configuração do FTP
const ftpConfig = {
  host: '46.202.90.62',
  port: 21,
  user: 'u715606397.ideolog.ia.br',
  password: ']X9CC>t~ihWhdzNq'
};

// Função para upload no FTP
async function uploadToFTP(localPath, remotePath) {
  const client = new ftp.Client();
  try {
    await client.access(ftpConfig);
    await client.uploadFrom(localPath, remotePath);
    return `https://ideolog.ia.br/${remotePath}`;
  } catch (error) {
    console.error('Erro no upload FTP:', error);
    throw error;
  } finally {
    client.close();
  }
}

// Rota para upload de imagem
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const localPath = req.file.path;
    const remotePath = req.file.filename;

    // Upload para FTP
    const imageUrl = await uploadToFTP(localPath, remotePath);

    // Remover arquivo local após upload
    fs.unlinkSync(localPath);

    res.json({ 
      success: true, 
      imageUrl: imageUrl,
      message: 'Imagem enviada com sucesso!' 
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    
    // Limpar arquivo local em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Erro no upload da imagem',
      details: error.message 
    });
  }
});

// Cache de imagens em memória
const imageCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Função para verificar se o cache é válido
function isCacheValid(timestamp) {
  return Date.now() - timestamp < CACHE_DURATION;
}

// Rota para servir imagens via proxy com cache (query parameter)
app.get('/api/image', async (req, res) => {
  try {
    const filename = req.query.filename;
    
    if (!filename) {
      return res.status(400).json({ error: 'Parâmetro filename é obrigatório' });
    }
    
    // Verificar cache primeiro
    const cached = imageCache.get(filename);
    if (cached && isCacheValid(cached.timestamp)) {
      console.log(`Serving cached image: ${filename}`);
      
      // Configurar headers para cache
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos
      res.setHeader('Content-Length', cached.buffer.length);
      
      return res.status(200).send(cached.buffer);
    }

    console.log(`Fetching image from FTP: ${filename}`);
    const client = new ftp.Client();
    
    await client.access(ftpConfig);
    
    // Verificar se o arquivo existe no FTP
    const files = await client.list();
    const fileExists = files.some(file => file.name === filename);
    
    if (!fileExists) {
      await client.close();
      return res.status(404).json({ error: 'Imagem não encontrada no FTP' });
    }
    
    // Baixar imagem do FTP
    const tempPath = `temp/${filename}`;
    await client.downloadTo(tempPath, filename);
    await client.close();
    
    // Ler o arquivo para buffer
    const imageBuffer = fs.readFileSync(tempPath);
    
    // Limpar arquivo temporário
    fs.unlinkSync(tempPath);
    
    // Determinar tipo de conteúdo
    const extension = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    
    // Armazenar no cache
    imageCache.set(filename, {
      buffer: imageBuffer,
      contentType: contentType,
      timestamp: Date.now()
    });
    
    // Limpar cache antigo (manter apenas os últimos 100 itens)
    if (imageCache.size > 100) {
      const oldestKey = imageCache.keys().next().value;
      imageCache.delete(oldestKey);
    }
    
    // Configurar headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos
    res.setHeader('Content-Length', imageBuffer.length);
    
    res.status(200).send(imageBuffer);
    
  } catch (error) {
    console.error('Erro no proxy de imagem:', error);
    res.status(500).json({ error: 'Erro ao carregar imagem do FTP' });
  }
});

// Rota para servir imagens via proxy com cache (path parameter)
app.get('/api/image/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Verificar cache primeiro
    const cached = imageCache.get(filename);
    if (cached && isCacheValid(cached.timestamp)) {
      console.log(`Serving cached image: ${filename}`);
      
      // Configurar headers para cache
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos
      res.setHeader('Content-Length', cached.buffer.length);
      
      return res.status(200).send(cached.buffer);
    }

    console.log(`Fetching image from FTP: ${filename}`);
    const client = new ftp.Client();
    
    await client.access(ftpConfig);
    
    // Verificar se o arquivo existe no FTP
    const files = await client.list();
    const fileExists = files.some(file => file.name === filename);
    
    if (!fileExists) {
      await client.close();
      return res.status(404).json({ error: 'Imagem não encontrada no FTP' });
    }
    
    // Baixar imagem do FTP
    const tempPath = `temp/${filename}`;
    await client.downloadTo(tempPath, filename);
    await client.close();
    
    // Ler o arquivo para buffer
    const imageBuffer = fs.readFileSync(tempPath);
    
    // Limpar arquivo temporário
    fs.unlinkSync(tempPath);
    
    // Determinar tipo de conteúdo
    const extension = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    
    // Armazenar no cache
    imageCache.set(filename, {
      buffer: imageBuffer,
      contentType: contentType,
      timestamp: Date.now()
    });
    
    // Limpar cache antigo (manter apenas os últimos 100 itens)
    if (imageCache.size > 100) {
      const oldestKey = imageCache.keys().next().value;
      imageCache.delete(oldestKey);
    }
    
    // Configurar headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutos
    res.setHeader('Content-Length', imageBuffer.length);
    
    res.status(200).send(imageBuffer);
    
  } catch (error) {
    console.error('Erro no proxy de imagem:', error);
    res.status(500).json({ error: 'Erro ao carregar imagem do FTP' });
  }
});

// Rota para deletar imagem
app.delete('/api/delete-image/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const client = new ftp.Client();
    
    await client.access(ftpConfig);
    await client.remove(filename);
    client.close();

    res.json({ 
      success: true, 
      message: 'Imagem deletada com sucesso!' 
    });

  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    res.status(500).json({ 
      error: 'Erro ao deletar imagem',
      details: error.message 
    });
  }
});

// ===== ROTAS DE API PARA FIRESTORE =====

// Rota para buscar dados de uma coleção
app.get('/api/firestore/get', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ 
        ok: false, 
        error: 'Firebase Admin SDK não configurado. Configure as variáveis FB_CLIENT_EMAIL e FB_PRIVATE_KEY.' 
      });
    }
    const { col = 'products', limit = '20', orderBy: orderField = 'createdAt', orderDirection = 'desc' } = req.query;
    
    let query = db.collection(String(col));
    
    // Aplicar ordenação
    if (orderField) {
      query = query.orderBy(orderField, orderDirection);
    }
    
    // Aplicar limite
    if (limit) {
      query = query.limit(Number(limit));
    }
    
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Cache agressivo para China (ajuste conforme necessidade)
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    
    res.status(200).json({ 
      ok: true, 
      count: data.length, 
      data,
      collection: col 
    });
  } catch (error) {
    console.error('Erro ao buscar dados do Firestore:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
});

// Rota para buscar um documento específico
app.get('/api/firestore/get/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const docRef = db.collection(collection).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Documento não encontrado' 
      });
    }
    
    const data = { id: doc.id, ...doc.data() };
    
    // Cache moderado para documentos individuais
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    
    res.status(200).json({ 
      ok: true, 
      data 
    });
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
});

// Rota para criar um documento
app.post('/api/firestore/create/:collection', async (req, res) => {
  try {
    const { collection } = req.params;
    const data = req.body;
    
    // Adicionar timestamps
    const docData = {
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection(collection).add(docData);
    
    res.status(201).json({ 
      ok: true, 
      id: docRef.id,
      message: 'Documento criado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao criar documento:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
});

// Rota para atualizar um documento
app.put('/api/firestore/update/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const data = req.body;
    
    // Adicionar timestamp de atualização
    const updateData = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = db.collection(collection).doc(id);
    await docRef.update(updateData);
    
    res.status(200).json({ 
      ok: true, 
      message: 'Documento atualizado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
});

// Rota para deletar um documento
app.delete('/api/firestore/delete/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    await db.collection(collection).doc(id).delete();
    
    res.status(200).json({ 
      ok: true, 
      message: 'Documento deletado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao deletar documento:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
});

// Rota para buscar produtos com informações da fábrica
app.get('/api/firestore/products-with-factory', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ 
        ok: false, 
        error: 'Firebase Admin SDK não configurado. Configure as variáveis FB_CLIENT_EMAIL e FB_PRIVATE_KEY.' 
      });
    }
    const { limit = '20' } = req.query;
    
    // Buscar produtos
    const productsSnapshot = await db.collection('products')
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .get();
    
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Carregar informações da fábrica para cada produto
    const productsWithFactory = await Promise.all(
      products.map(async (product) => {
        if (product.factoryId) {
          try {
            const factoryDoc = await db.collection('factories').doc(product.factoryId).get();
            if (factoryDoc.exists) {
              return { 
                ...product, 
                factory: { id: factoryDoc.id, ...factoryDoc.data() } 
              };
            }
          } catch (err) {
            console.error(`Erro ao carregar fábrica para produto ${product.name}:`, err);
          }
        }
        return { ...product, factory: null };
      })
    );
    
    // Cache agressivo para China
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    
    res.status(200).json({ 
      ok: true, 
      count: productsWithFactory.length, 
      data: productsWithFactory 
    });
  } catch (error) {
    console.error('Erro ao buscar produtos com fábrica:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
});

// Rota para buscar produtos de uma fábrica específica
app.get('/api/firestore/products-by-factory', async (req, res) => {
  try {
    const { factoryId } = req.query;
    const { limit = '20' } = req.query;
    
    if (!factoryId) {
      return res.status(400).json({ 
        ok: false, 
        error: 'factoryId é obrigatório' 
      });
    }
    
    const productsSnapshot = await db.collection('products')
      .where('factoryId', '==', factoryId)
      .get();
    
    const products = productsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Aplicar limite após obter os dados para evitar problemas de índice
    const limitedProducts = products.slice(0, Number(limit));
    
    // Cache moderado
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    
    res.status(200).json({ 
      ok: true, 
      count: limitedProducts.length, 
      data: limitedProducts,
      factoryId 
    });
  } catch (error) {
    console.error('Erro ao buscar produtos da fábrica:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Erro interno do servidor' 
    });
  }
});

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando!' });
});

// Rota de teste para imagens
app.get('/api/test-image', async (req, res) => {
  try {
    const client = new ftp.Client();
    await client.access(ftpConfig);
    const files = await client.list();
    await client.close();
    
    res.json({ 
      message: 'Conexão FTP OK', 
      filesCount: files.length,
      files: files.map(f => f.name)
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro na conexão FTP',
      details: error.message 
    });
  }
});

// Rota de teste para download de imagem específica
app.get('/api/test-download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    console.log(`Tentando baixar: ${filename}`);
    
    const client = new ftp.Client();
    await client.access(ftpConfig);
    
    // Verificar se o arquivo existe
    const files = await client.list();
    const fileExists = files.some(file => file.name === filename);
    
    if (!fileExists) {
      await client.close();
      return res.status(404).json({ error: 'Arquivo não encontrado', availableFiles: files.map(f => f.name) });
    }
    
    console.log(`Arquivo encontrado, baixando...`);
    
    // Usar downloadTo para arquivo temporário
    const tempPath = `temp/${filename}`;
    await client.downloadTo(tempPath, filename);
    await client.close();
    
    // Ler o arquivo para buffer
    const imageBuffer = fs.readFileSync(tempPath);
    
    // Limpar arquivo temporário
    fs.unlinkSync(tempPath);
    
    console.log(`Download concluído, tamanho: ${imageBuffer.length} bytes`);
    
    // Determinar tipo de conteúdo
    const extension = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', imageBuffer.length);
    res.status(200).send(imageBuffer);
    
  } catch (error) {
    console.error('Erro no teste de download:', error);
    res.status(500).json({ 
      error: 'Erro ao baixar imagem',
      details: error.message 
    });
  }
});

// Rota de teste para verificar produtos do Firebase
app.get('/api/test-products', async (req, res) => {
  try {
    res.json({
      message: 'Endpoint de teste de produtos',
      note: 'Para testar produtos, use o frontend em http://localhost:3000'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Teste: http://localhost:${PORT}/api/test`);
});
