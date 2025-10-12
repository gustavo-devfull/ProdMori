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
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { filename } = req.query;

  if (!filename) {
    return res.status(400).json({ error: 'Nome do arquivo não fornecido' });
  }

  try {
    // Conectar ao FTP e deletar arquivo
    const client = new ftp.Client();
    await client.access(ftpConfig);
    
    // Verificar se o arquivo existe antes de deletar
    const files = await client.list();
    const fileExists = files.some(file => file.name === filename);
    
    if (fileExists) {
      await client.remove(filename);
      await client.close();
      
      res.status(200).json({
        success: true,
        message: 'Arquivo deletado com sucesso'
      });
    } else {
      await client.close();
      res.status(404).json({ 
        error: 'Arquivo não encontrado' 
      });
    }

  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}
