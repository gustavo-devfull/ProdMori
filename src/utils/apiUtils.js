// Utilitários para tratamento de erros de API
export class APIError extends Error {
  constructor(message, status, statusText) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.statusText = statusText;
  }
}

// Função para tratar resposta de API com tratamento robusto de erros
export async function handleAPIResponse(response, defaultErrorMessage = 'Erro na API') {
  if (!response.ok) {
    let errorMessage = defaultErrorMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch (e) {
      errorMessage = `Erro ${response.status}: ${response.statusText}`;
    }
    throw new APIError(errorMessage, response.status, response.statusText);
  }

  try {
    const result = await response.json();
    
    if (!result.ok) {
      throw new APIError(result.error || 'Erro na resposta da API', response.status, response.statusText);
    }

    return result;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(`Erro ao processar resposta: ${error.message}`, response.status, response.statusText);
  }
}

// Função para fazer fetch com tratamento de erro padrão
export async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return await handleAPIResponse(response);
  } catch (error) {
    console.error(`Erro na API ${url}:`, error);
    throw error;
  }
}
