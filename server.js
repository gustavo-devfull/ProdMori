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
    const uploadDir = '/tmp/uploads/';
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created upload directory:', uploadDir);
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(file.originalname);
    const filename = `product_${timestamp}_${randomString}${extension}`;
    console.log('Generated filename:', filename);
    cb(null, filename);
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

// Configuração do multer para upload de áudio
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/tmp/uploads/audio/';
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created audio upload directory:', uploadDir);
      }
      cb(null, uploadDir);
    } catch (error) {
      console.error('Error creating audio upload directory:', error);
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(file.originalname);
    const filename = `audio_${timestamp}_${randomString}${extension}`;
    console.log('Generated audio filename:', filename);
    cb(null, filename);
  }
});

const audioUpload = multer({ 
  storage: audioStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB para áudio
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de áudio são permitidos'), false);
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
    console.log('Connecting to FTP server...');
    await client.access(ftpConfig);
    console.log('FTP connection successful');
    
    console.log(`Uploading file: ${localPath} -> ${remotePath}`);
    await client.uploadFrom(localPath, remotePath);
    console.log('FTP upload completed');
    
    const imageUrl = `https://ideolog.ia.br/${remotePath}`;
    console.log('Generated image URL:', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('Erro no upload FTP:', error);
    throw error;
  } finally {
    try {
      client.close();
      console.log('FTP connection closed');
    } catch (closeError) {
      console.error('Error closing FTP connection:', closeError);
    }
  }
}

// Rota para upload de imagem
app.post('/api/upload-image', (req, res) => {
  upload.single('image')(req, res, async (err) => {
    try {
      console.log('Upload request received:', req.file ? 'File present' : 'No file');
      console.log('Multer error:', err);
      
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ 
          error: 'Erro no processamento do arquivo',
          details: err.message 
        });
      }
      
      if (!req.file) {
        console.log('No file uploaded');
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      console.log('File details:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      });

      const localPath = req.file.path;
      const remotePath = req.file.filename;

      // Retornar resposta imediata com URL direta do FTP
      const ftpImageUrl = `https://ideolog.ia.br/${remotePath}`;
      
      const response = { 
        success: true, 
        imageUrl: ftpImageUrl,
        message: 'Imagem enviada com sucesso!',
        temp: false // Não é temporária, é a URL final
      };
      
      // Tentar fazer upload FTP com timeout
      try {
        console.log('Starting FTP upload with timeout...');
        const uploadPromise = uploadToFTP(localPath, remotePath);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('FTP upload timeout')), 10000) // 10 segundos
        );
        
        await Promise.race([uploadPromise, timeoutPromise]);
        console.log('FTP upload completed successfully');
        
        // Remover arquivo local após upload bem-sucedido
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          console.log('Local file cleaned up after successful FTP upload');
        }
      } catch (error) {
        console.error('FTP upload failed or timed out:', error);
        // Continuar mesmo se o FTP falhar - a imagem já foi salva localmente
      }

      console.log('Sending response:', response);
      res.json(response);

    } catch (error) {
      console.error('Erro no upload:', error);
      
      // Limpar arquivo local em caso de erro
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('Local file cleaned up after error');
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }

      const errorResponse = { 
        error: 'Erro no upload da imagem',
        details: error.message 
      };
      
      console.log('Sending error response:', errorResponse);
      res.status(500).json(errorResponse);
    }
  });
});

// Rota para upload de áudio
app.post('/api/upload-audio', (req, res) => {
  audioUpload.single('audio')(req, res, async (err) => {
    try {
      console.log('Audio upload request received:', req.file ? 'File present' : 'No file');
      console.log('Multer error:', err);
      
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ 
          error: 'Erro no processamento do arquivo de áudio',
          details: err.message 
        });
      }
      
      if (!req.file) {
        console.log('No audio file uploaded');
        return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado' });
      }

      console.log('Audio file details:', {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      const localPath = req.file.path;
      const fileName = req.body.fileName || req.file.filename;
      const productId = req.body.productId;
      
      // Criar pasta de áudio no FTP
      const remotePath = `audio/${fileName}`;

      // Retornar resposta imediata com URL direta do FTP
      const ftpAudioUrl = `https://ideolog.ia.br/${remotePath}`;
      
      const response = { 
        success: true, 
        audioUrl: ftpAudioUrl,
        fileName: fileName,
        duration: 0, // Será calculado pelo cliente
        message: 'Áudio enviado com sucesso!'
      };
      
      // Tentar fazer upload FTP com timeout
      try {
        console.log('Starting FTP audio upload with timeout...');
        const uploadPromise = uploadToFTP(localPath, remotePath);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('FTP upload timeout')), 30000) // 30 segundos para áudio
        );
        
        await Promise.race([uploadPromise, timeoutPromise]);
        console.log('FTP audio upload completed successfully');
        
        // Limpar arquivo local após upload bem-sucedido
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          console.log('Local audio file cleaned up');
        }
        
      } catch (ftpError) {
        console.error('FTP upload error (continuing with response):', ftpError);
        // Continuar mesmo com erro FTP - o cliente pode tentar novamente
      }
      
      console.log('Sending audio response:', response);
      res.json(response);

    } catch (error) {
      console.error('Erro no upload de áudio:', error);
      
      // Limpar arquivo local em caso de erro
      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
          console.log('Local audio file cleaned up after error');
        } catch (cleanupError) {
          console.error('Error cleaning up audio file:', cleanupError);
        }
      }

      const errorResponse = { 
        error: 'Erro no upload do áudio',
        details: error.message 
      };
      
      console.log('Sending audio error response:', errorResponse);
      res.status(500).json(errorResponse);
    }
  });
});

// Função para upload FTP em background
async function uploadToFTPInBackground(localPath, remotePath) {
  try {
    console.log('Starting background FTP upload...');
    const imageUrl = await uploadToFTP(localPath, remotePath);
    console.log('Background FTP upload successful:', imageUrl);
    
    // Remover arquivo local após upload bem-sucedido
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log('Local file cleaned up after successful FTP upload');
    }
  } catch (error) {
    console.error('Background FTP upload failed:', error);
    
    // Remover arquivo local mesmo em caso de erro após um tempo
    setTimeout(() => {
      if (fs.existsSync(localPath)) {
        try {
          fs.unlinkSync(localPath);
          console.log('Local file cleaned up after FTP upload timeout');
        } catch (cleanupError) {
          console.error('Error cleaning up file after timeout:', cleanupError);
        }
      }
    }, 5 * 60 * 1000); // 5 minutos
  }
}

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

// Servir arquivos estáticos do React apenas em desenvolvimento local
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  // Servir arquivos estáticos da pasta build
  app.use(express.static(path.join(__dirname, 'build')));
  
  // Para todas as rotas que não são API, servir o index.html do React
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// ===== ROTAS DE TAGS =====

// Rota para criar tag
app.post('/api/firestore/create/tags', async (req, res) => {
  try {
    console.log('Creating tag in Firebase:', req.body);
    console.log('Firebase environment variables:', {
      FB_PROJECT_ID: process.env.FB_PROJECT_ID ? 'SET' : 'NOT SET',
      FB_CLIENT_EMAIL: process.env.FB_CLIENT_EMAIL ? 'SET' : 'NOT SET',
      FB_PRIVATE_KEY: process.env.FB_PRIVATE_KEY ? 'SET' : 'NOT SET'
    });

    if (!db) {
      console.error('Firebase not initialized');
      return res.status(500).json({ 
        error: 'Firebase not initialized',
        details: 'Firebase Admin SDK not properly configured'
      });
    }

    const { tagData, factoryId } = req.body;

    if (!tagData || !factoryId) {
      return res.status(400).json({ error: 'tagData and factoryId are required' });
    }

    // Criar documento da tag
    const tagRef = await db.collection('tags').add({
      ...tagData,
      factoryId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Tag created successfully:', tagRef.id);

    res.status(200).json({
      success: true,
      id: tagRef.id,
      message: 'Tag criada com sucesso'
    });

  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Rota para buscar tags
app.get('/api/firestore/get/tags', async (req, res) => {
  try {
    console.log('Getting tags from Firebase');
    console.log('Firebase environment variables:', {
      FB_PROJECT_ID: process.env.FB_PROJECT_ID ? 'SET' : 'NOT SET',
      FB_CLIENT_EMAIL: process.env.FB_CLIENT_EMAIL ? 'SET' : 'NOT SET',
      FB_PRIVATE_KEY: process.env.FB_PRIVATE_KEY ? 'SET' : 'NOT SET'
    });

    if (!db) {
      console.error('Firebase not initialized');
      return res.status(500).json({ 
        error: 'Firebase not initialized',
        details: 'Firebase Admin SDK not properly configured'
      });
    }

    const { factoryId, division } = req.query;

    let query = db.collection('tags');

    // Filtrar por fábrica se especificado
    if (factoryId) {
      query = query.where('factoryId', '==', factoryId);
    }

    // Filtrar por divisão se especificado
    if (division) {
      query = query.where('division', '==', division);
    }

    // Ordenar por data de criação
    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const tags = [];

    snapshot.forEach(doc => {
      tags.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`Found ${tags.length} tags`);

    res.status(200).json({
      success: true,
      data: tags,
      count: tags.length
    });

  } catch (error) {
    console.error('Error getting tags:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Rota para atualizar tag
app.put('/api/firestore/update/tags', async (req, res) => {
  try {
    console.log('Updating tag in Firebase:', req.body);

    if (!db) {
      console.error('Firebase not initialized');
      return res.status(500).json({ 
        error: 'Firebase not initialized',
        details: 'Firebase Admin SDK not properly configured'
      });
    }

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
});

// Rota para deletar tag
app.delete('/api/firestore/delete/tags', async (req, res) => {
  try {
    console.log('Deleting tag from Firebase:', req.body);

    if (!db) {
      console.error('Firebase not initialized');
      return res.status(500).json({ 
        error: 'Firebase not initialized',
        details: 'Firebase Admin SDK not properly configured'
      });
    }

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
});

// Para Vercel, exportar o app como módulo
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // Para desenvolvimento local, usar app.listen
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Teste: http://localhost:${PORT}/api/test`);
  });
}
