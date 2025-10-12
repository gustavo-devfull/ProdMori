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

// Rota para servir imagens via proxy
app.get('/api/image/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const client = new ftp.Client();
    
    await client.access(ftpConfig);
    
    // Baixar imagem do FTP
    const localPath = `temp/${filename}`;
    await client.downloadTo(localPath, filename);
    
    // Servir a imagem
    res.sendFile(path.resolve(localPath), (err) => {
      // Limpar arquivo temporário
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      
      if (err) {
        console.error('Erro ao servir imagem:', err);
        res.status(404).json({ error: 'Imagem não encontrada' });
      }
    });
    
    client.close();
  } catch (error) {
    console.error('Erro no proxy de imagem:', error);
    res.status(500).json({ error: 'Erro ao carregar imagem' });
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

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Teste: http://localhost:${PORT}/api/test`);
});
