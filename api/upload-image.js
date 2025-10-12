const multer = require('multer');
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

// Configuração do multer para upload temporário
const upload = multer({
  dest: '/tmp/',
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Configuração FTP
const ftpConfig = {
  host: '46.202.90.62',
  port: 21,
  user: 'u715606397.ideolog.ia.br',
  password: ']X9CC>t~ihWhdzNq',
  secure: false
};

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Usar multer para processar o upload
    await new Promise((resolve, reject) => {
      upload.single('image')(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo fornecido' });
    }

    // Validar tipo de arquivo
    if (!req.file.mimetype.startsWith('image/')) {
      // Limpar arquivo temporário
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Apenas arquivos de imagem são permitidos' });
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(req.file.originalname);
    const filename = `product_${timestamp}_${randomString}${extension}`;

    // Conectar ao FTP e fazer upload
    const client = new ftp.Client();
    await client.access(ftpConfig);
    
    // Upload do arquivo para o FTP
    await client.uploadFrom(req.file.path, filename);
    await client.close();

    // Limpar arquivo temporário
    fs.unlinkSync(req.file.path);

    // Retornar URL da imagem
    const imageUrl = `https://ideolog.ia.br/${filename}`;
    
    res.status(200).json({
      success: true,
      imageUrl: imageUrl,
      filename: filename
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    
    // Limpar arquivo temporário em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}

// Configurar tamanho máximo do body
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
}

