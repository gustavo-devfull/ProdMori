const express = require('express');
const multer = require('multer');
const ftp = require('basic-ftp');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

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
    fileSize: 5 * 1024 * 1024 // 5MB
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
    return `http://ideolog.ia.br/${remotePath}`;
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

// Rota para servir imagens via proxy com cache
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
