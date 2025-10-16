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
    console.log('File filter - mimetype:', file.mimetype, 'fieldname:', file.fieldname);
    if (file.mimetype.startsWith('audio/')) {
      console.log('Audio file accepted');
      cb(null, true);
    } else {
      console.log('Non-audio file rejected:', file.mimetype);
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
        
        // Criar pasta audio/ se não existir
        const client = new ftp.Client();
        await client.access(ftpConfig);
        
        try {
          await client.ensureDir('audio/');
          console.log('Pasta audio/ criada/verificada');
        } catch (dirError) {
          console.log('Pasta audio/ já existe ou erro ao criar:', dirError.message);
        }
        
        await client.close();
        
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

// Rota OPTIONS para CORS
app.options('/api/audio', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range');
  res.status(200).end();
});

// Rota HEAD para metadados de áudio (usado pelo iOS)
app.head('/api/audio', async (req, res) => {
  try {
    const filename = req.query.filename;
    
    console.log('=== AUDIO HEAD REQUEST ===');
    console.log('Filename:', filename);
    
    if (!filename) {
      return res.status(400).end();
    }
    
    const client = new ftp.Client();
    await client.access(ftpConfig);
    
    try {
      await client.ensureDir('audio/');
    } catch (dirError) {
      // Ignorar erro de diretório
    }
    
    const fileList = await client.list('audio/');
    const fileExists = fileList.some(file => file.name === filename);
    
    await client.close();
    
    if (!fileExists) {
      return res.status(404).end();
    }
    
    const extension = filename.split('.').pop().toLowerCase();
    const contentTypeMap = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'webm': 'audio/webm',
      'm4a': 'audio/mp4',
      'mp4': 'audio/mp4',
      'aac': 'audio/aac'
    };
    
    const contentType = contentTypeMap[extension] || 'audio/mpeg';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range');
    
    if (extension === 'm4a' || extension === 'mp4') {
      res.setHeader('Accept-Ranges', 'bytes');
    }
    
    console.log('HEAD response sent for:', filename);
    res.status(200).end();
    
  } catch (error) {
    console.error('Erro no HEAD request:', error);
    res.status(500).end();
  }
});

// Rota para servir áudios via proxy com cache (versão simplificada para produção)
app.get('/api/audio', async (req, res) => {
  try {
    const filename = req.query.filename;
    
    console.log('=== AUDIO PROXY REQUEST ===');
    console.log('Filename:', filename);
    console.log('Request URL:', req.url);
    
    if (!filename) {
      console.log('ERROR: Nome do arquivo não fornecido');
      return res.status(400).json({ error: 'Nome do arquivo de áudio não fornecido' });
    }
    
    console.log(`Conectando ao FTP para buscar: ${filename}`);
    const client = new ftp.Client();
    
    try {
      await client.access(ftpConfig);
      console.log('Conexão FTP estabelecida');
      
      // Criar pasta audio/ se não existir
      try {
        await client.ensureDir('audio/');
        console.log('Pasta audio/ criada/verificada');
      } catch (dirError) {
        console.log('Pasta audio/ já existe ou erro ao criar:', dirError.message);
      }
      
    } catch (ftpError) {
      console.error('Erro ao conectar ao FTP:', ftpError);
      return res.status(500).json({ error: 'Erro ao conectar ao servidor FTP' });
    }
    
    // Verificar se o arquivo existe (opcional - tentar download direto se falhar)
    try {
      console.log('Listando arquivos na pasta audio/');
      const fileList = await client.list('audio/');
      console.log('Arquivos encontrados:', fileList.map(f => f.name));
      
      const fileExists = fileList.some(file => file.name === filename);
      console.log(`Arquivo ${filename} existe:`, fileExists);
      
      if (!fileExists) {
        await client.close();
        console.log('ERROR: Arquivo não encontrado no FTP');
        return res.status(404).json({ error: 'Arquivo de áudio não encontrado' });
      }
    } catch (listError) {
      console.error('Erro ao listar arquivos de áudio:', listError);
      console.log('Continuando sem verificação - tentando download direto...');
      // Continuar sem verificação - tentar download direto
    }
    
    // Criar diretório temp se não existir (compatível com Vercel)
    const tempDir = process.env.VERCEL ? '/tmp' : 'temp';
    if (!fs.existsSync(tempDir)) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
        console.log('Diretório temp criado:', tempDir);
      } catch (mkdirError) {
        console.error('Erro ao criar diretório temp:', mkdirError);
        // Usar diretório alternativo
        const altTempDir = '/tmp';
        console.log('Tentando usar diretório alternativo:', altTempDir);
      }
    }
    
    // Baixar áudio do FTP (versão simplificada)
    const tempPath = `${tempDir}/${filename}`;
    console.log(`Baixando arquivo para: ${tempPath}`);
    
    try {
      // Usar timeout mais longo para produção
      const timeoutMs = process.env.VERCEL ? 60000 : 30000; // 60s no Vercel, 30s local
      
      const downloadPromise = client.downloadTo(tempPath, `audio/${filename}`);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Download timeout')), timeoutMs)
      );
      
      await Promise.race([downloadPromise, timeoutPromise]);
      console.log('Download concluído com sucesso');
      
    } catch (downloadError) {
      console.error('Erro no download:', downloadError);
      
      // Tentar caminho direto como fallback
      try {
        console.log('Tentando download com caminho direto...');
        await client.downloadTo(tempPath, filename);
        console.log('Download concluído com caminho direto');
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError);
        await client.close();
        return res.status(500).json({ 
          error: 'Erro ao baixar arquivo de áudio',
          details: downloadError.message,
          fallback: fallbackError.message
        });
      }
    }
    
    await client.close();
    console.log('Conexão FTP fechada');
    
    // Verificar se o arquivo foi baixado
    if (!fs.existsSync(tempPath)) {
      console.log('ERROR: Arquivo não foi baixado');
      return res.status(500).json({ error: 'Arquivo não foi baixado do FTP' });
    }
    
    // Ler o arquivo para buffer
    console.log('Lendo arquivo para buffer');
    const audioBuffer = fs.readFileSync(tempPath);
    console.log(`Arquivo lido, tamanho: ${audioBuffer.length} bytes`);
    
    // Limpar arquivo temporário
    try {
      fs.unlinkSync(tempPath);
      console.log('Arquivo temporário removido');
    } catch (cleanupError) {
      console.error('Erro ao limpar arquivo temporário:', cleanupError);
    }
    
    // Determinar tipo de conteúdo baseado na extensão
    const extension = filename.split('.').pop().toLowerCase();
    const contentTypeMap = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'webm': 'audio/webm',
      'm4a': 'audio/mp4',
      'mp4': 'audio/mp4',
      'aac': 'audio/aac'
    };
    
    const contentType = contentTypeMap[extension] || 'audio/mpeg';
    console.log(`Content-Type definido como: ${contentType}`);
    console.log(`Arquivo: ${filename}, Extensão: ${extension}`);
    
    // Configurar headers para melhor compatibilidade com iOS
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hora
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Range');
    
    // Headers específicos para iOS e M4A
    if (extension === 'm4a' || extension === 'mp4') {
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      console.log('Headers específicos para M4A/MP4 aplicados');
    }
    
    // Log dos headers para debug
    console.log('Headers configurados:', {
      'Content-Type': contentType,
      'Content-Length': audioBuffer.length,
      'Accept-Ranges': extension === 'm4a' || extension === 'mp4' ? 'bytes' : 'n/a'
    });
    
    console.log('Enviando resposta com sucesso');
    res.status(200).send(audioBuffer);
    
  } catch (error) {
    console.error('=== ERRO NO PROXY DE ÁUDIO ===');
    console.error('Erro completo:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro ao carregar áudio do FTP',
      details: error.message,
      filename: req.query.filename
    });
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

// Rota de teste para verificar arquivo de áudio
app.get('/api/test-audio/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    console.log('=== TESTE DE ÁUDIO ===');
    console.log('Filename:', filename);
    
    const client = new ftp.Client();
    
    try {
      await client.access(ftpConfig);
      console.log('Conexão FTP estabelecida');
      
      // Listar arquivos na pasta audio
      const fileList = await client.list('audio/');
      console.log('Arquivos na pasta audio:', fileList.map(f => f.name));
      
      const fileExists = fileList.some(file => file.name === filename);
      console.log(`Arquivo ${filename} existe:`, fileExists);
      
      if (fileExists) {
        const fileInfo = fileList.find(file => file.name === filename);
        console.log('Informações do arquivo:', fileInfo);
        
        res.json({
          success: true,
          exists: true,
          filename: filename,
          fileInfo: fileInfo,
          allFiles: fileList.map(f => f.name)
        });
      } else {
        res.json({
          success: true,
          exists: false,
          filename: filename,
          allFiles: fileList.map(f => f.name)
        });
      }
      
    } catch (ftpError) {
      console.error('Erro FTP:', ftpError);
      res.status(500).json({
        success: false,
        error: 'Erro de conexão FTP',
        details: ftpError.message
      });
    } finally {
      await client.close();
    }
    
  } catch (error) {
    console.error('Erro no teste:', error);
    res.status(500).json({
      success: false,
      error: error.message
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

// Rota para deletar produto
app.delete('/api/firestore/delete/products/:id', async (req, res) => {
  try {
    console.log('=== DELETE PRODUCT REQUEST ===');
    console.log('Product ID:', req.params.id);
    
    if (!db) {
      console.error('Firebase not initialized');
      return res.status(500).json({ 
        error: 'Firebase not initialized',
        details: 'Firebase Admin SDK not properly configured'
      });
    }

    const productId = req.params.id;
    console.log('Deleting product with ID:', productId);

    // Verificar se o produto existe
    const productDoc = await db.collection('products').doc(productId).get();
    
    if (!productDoc.exists) {
      console.log('Product not found');
      return res.status(404).json({ 
        error: 'Produto não encontrado',
        details: `Produto com ID ${productId} não existe`
      });
    }

    console.log('Product found, deleting...');
    
    // Deletar o produto
    await db.collection('products').doc(productId).delete();
    
    console.log('Product deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Produto deletado com sucesso',
      id: productId
    });

  } catch (error) {
    console.error('=== ERROR DELETING PRODUCT ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
});

// Rota para buscar tags
app.get('/api/firestore/get/tags', async (req, res) => {
  try {
    console.log('=== GET TAGS REQUEST ===');
    console.log('Query params:', req.query);
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
    console.log('Filtering by factoryId:', factoryId, 'division:', division);

    let query = db.collection('tags');

    // Filtrar por fábrica se especificado
    if (factoryId) {
      console.log('Adding factoryId filter:', factoryId);
      query = query.where('factoryId', '==', factoryId);
    }

    // Filtrar por divisão se especificado
    if (division) {
      console.log('Adding division filter:', division);
      query = query.where('division', '==', division);
    }

    // Ordenar por data de criação (apenas se não há filtros específicos)
    if (!factoryId && !division) {
      query = query.orderBy('createdAt', 'desc');
    }

    console.log('Executing query...');
    const snapshot = await query.get();
    console.log('Query executed successfully, snapshot size:', snapshot.size);
    
    const tags = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('Tag data:', { id: doc.id, ...data });
      tags.push({
        id: doc.id,
        ...data
      });
    });

    console.log(`Found ${tags.length} tags`);

    res.status(200).json({
      success: true,
      data: tags,
      count: tags.length
    });

  } catch (error) {
    console.error('=== ERROR GETTING TAGS ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message,
      code: error.code || 'UNKNOWN'
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
