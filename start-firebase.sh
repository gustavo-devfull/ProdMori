#!/bin/bash

# Script para iniciar o servidor Firebase local
echo "🔥 Iniciando servidor Firebase local..."

# Verificar se a porta 3001 está em uso
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ Servidor Firebase já está rodando na porta 3001"
else
    echo "🚀 Iniciando servidor Firebase na porta 3001..."
    
    # Tentar iniciar o servidor Firebase
    if command -v firebase &> /dev/null; then
        firebase serve --port 3001 &
        echo "✅ Servidor Firebase iniciado com sucesso!"
    else
        echo "❌ Firebase CLI não encontrado. Instale com: npm install -g firebase-tools"
        echo "💡 Ou inicie manualmente o servidor na porta 3001"
    fi
fi

echo "🌐 Servidor Firebase disponível em: http://localhost:3001"
