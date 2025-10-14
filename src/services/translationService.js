class TranslationService {
  constructor() {
    this.cache = new Map();
  }

  // Função para traduzir texto usando Google Translate API (gratuita)
  async translateText(text, fromLang = 'zh', toLang = 'pt') {
    if (!text || text.trim() === '') {
      return text;
    }

    // Verificar cache primeiro
    const cacheKey = `${text}_${fromLang}_${toLang}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Usar Google Translate API gratuita
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`);
      
      if (!response.ok) {
        throw new Error('Translation API error');
      }

      const data = await response.json();
      
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        const translatedText = data[0][0][0];
        
        // Armazenar no cache
        this.cache.set(cacheKey, translatedText);
        
        return translatedText;
      }
      
      return text; // Retornar texto original se não conseguir traduzir
    } catch (error) {
      console.warn('Translation failed:', error);
      return text; // Retornar texto original em caso de erro
    }
  }

  // Função para traduzir múltiplos campos de uma vez
  async translateFields(fields, fromLang = 'zh', toLang = 'pt') {
    const translatedFields = {};
    
    for (const [key, value] of Object.entries(fields)) {
      if (value && typeof value === 'string' && value.trim() !== '') {
        translatedFields[key] = await this.translateText(value, fromLang, toLang);
      } else {
        translatedFields[key] = value;
      }
    }
    
    return translatedFields;
  }

  // Função para detectar se o texto está em mandarim
  isChinese(text) {
    if (!text || typeof text !== 'string') return false;
    
    // Regex para detectar caracteres chineses
    const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3300-\u33ff\ufe30-\ufe4f\uf900-\ufaff\u{2f800}-\u{2fa1f}]/u;
    return chineseRegex.test(text);
  }

  // Função para detectar se o texto está em português
  isPortuguese(text) {
    if (!text || typeof text !== 'string') return false;
    
    // Regex para detectar caracteres latinos com acentos portugueses
    const portugueseRegex = /[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i;
    return portugueseRegex.test(text) || /[a-z]/i.test(text);
  }

  // Função para traduzir automaticamente baseado no idioma atual
  async autoTranslate(text, currentLanguage) {
    if (!text || text.trim() === '') return text;
    
    if (currentLanguage === 'pt' && this.isChinese(text)) {
      // Se está em português mas o texto é chinês, traduzir para português
      return await this.translateText(text, 'zh', 'pt');
    } else if (currentLanguage === 'zh' && this.isPortuguese(text)) {
      // Se está em chinês mas o texto é português, traduzir para chinês
      return await this.translateText(text, 'pt', 'zh');
    }
    
    return text; // Não precisa traduzir
  }

  // Limpar cache
  clearCache() {
    this.cache.clear();
  }
}

export default new TranslationService();
