const ftp = require('basic-ftp');

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { filename } = req.query;

  if (!filename) {
    return res.status(400).json({ error: 'Nome do arquivo não fornecido' });
  }

  try {
    // Conectar ao FTP e baixar arquivo
    const client = new ftp.Client();
    await client.access(ftpConfig);
    
    // Verificar se o arquivo existe
    const files = await client.list();
    const fileExists = files.some(file => file.name === filename);
    
    if (!fileExists) {
      await client.close();
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Baixar arquivo do FTP
    const fileBuffer = await client.downloadToBuffer(filename);
    await client.close();

    // Determinar tipo de conteúdo baseado na extensão
    const extension = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };
    
    const contentType = mimeTypes[extension] || 'application/octet-stream';
    
    // Configurar headers para cache
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 ano
    res.setHeader('Content-Length', fileBuffer.length);
    
    // Enviar arquivo
    res.status(200).send(fileBuffer);

  } catch (error) {
    console.error('Erro ao servir imagem:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}


