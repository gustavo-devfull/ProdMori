import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Função de login
  const login = async (email, password) => {
    try {
      setLoading(true);
      
      // Verificar se é um dos emails de admin válidos
      const adminEmails = ['gutopc@gmail.com', 'vinicius@ravi.com.br', 'cotacao@ravi.com.br'];
      const adminPassword = '@RaviMori147';
      
      if (adminEmails.includes(email) && password === adminPassword) {
        console.log('🔐 Login local bem-sucedido para:', email);
        // Criar um objeto de usuário simulado
        const mockUser = {
          uid: 'local-admin-' + email,
          email: email,
          displayName: email.split('@')[0],
          emailVerified: true
        };
        
        // Salvar no localStorage para persistir entre recarregamentos
        localStorage.setItem('localUser', JSON.stringify(mockUser));
        
        setUser(mockUser);
        navigate('/dashboard');
        return mockUser;
      }
      
      // Tentar login via Firebase (se a rede estiver funcionando)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
      return userCredential.user;
    } catch (error) {
      console.error('Erro no login:', error);
      
      // Se for erro de rede, mostrar mensagem específica
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Erro de conexão com Firebase. Verifique sua conexão com a internet.');
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const logout = async () => {
    try {
      // Se for usuário simulado, apenas limpar o estado
      if (user && user.uid.startsWith('local-admin-')) {
        console.log('🔐 Logout local para usuário simulado');
        localStorage.removeItem('localUser');
        setUser(null);
        return;
      }
      
      // Logout via Firebase
      await signOut(auth);
      localStorage.removeItem('localUser');
    } catch (error) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, limpar o usuário local
      localStorage.removeItem('localUser');
      setUser(null);
    }
  };

  // Verificar se o usuário é admin
  const isAdmin = (user) => {
    const adminEmails = ['gutopc@gmail.com', 'vinicius@ravi.com.br', 'cotacao@ravi.com.br'];
    return user && adminEmails.includes(user.email);
  };

  // Observar mudanças no estado de autenticação
  useEffect(() => {
    console.log('🔐 AuthContext - Iniciando observador de autenticação...');
    
    // Verificar se há usuário salvo no localStorage
    const savedUser = localStorage.getItem('localUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        console.log('🔐 AuthContext - Usuário encontrado no localStorage:', user.email);
        setUser(user);
        setLoading(false);
        
        // Se estiver na página inicial, redirecionar para dashboard
        if (window.location.pathname === '/') {
          navigate('/dashboard');
        }
        
        // Não configurar o observador do Firebase se já temos usuário local
        console.log('🔐 AuthContext - Usuário local encontrado, pulando configuração do Firebase');
        return;
      } catch (error) {
        console.error('🔐 AuthContext - Erro ao carregar usuário do localStorage:', error);
        localStorage.removeItem('localUser');
      }
    }
    
    try {
      console.log('🔐 AuthContext - Auth object:', auth);
      
      // Verificar se o auth está disponível
      if (!auth) {
        console.error('🔐 AuthContext - Auth object não está disponível!');
        setLoading(false);
        return;
      }
      
      console.log('🔐 AuthContext - Auth object válido, configurando timeout...');
      
      // Timeout de segurança para evitar loading infinito
      const timeoutId = setTimeout(() => {
        console.log('🔐 AuthContext - Timeout atingido, forçando loading = false');
        setLoading(false);
      }, 2000); // 2 segundos
      
      console.log('🔐 AuthContext - Configurando onAuthStateChanged...');
      
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('🔐 AuthContext - Estado de autenticação mudou:', user ? 'Usuário logado' : 'Usuário não logado');
        clearTimeout(timeoutId); // Limpar timeout se callback foi chamado
        
        // Verificar se há usuário local salvo antes de sobrescrever
        const savedUser = localStorage.getItem('localUser');
        if (savedUser && !user) {
          console.log('🔐 AuthContext - Mantendo usuário local, ignorando Firebase null');
          setLoading(false);
          return;
        }
        
        // Se Firebase retornou um usuário válido, usar ele
        if (user) {
          console.log('🔐 AuthContext - Usando usuário do Firebase');
          setUser(user);
          setLoading(false);
          
          // Se o usuário estiver logado e estiver na página de login, redirecionar para dashboard
          if (window.location.pathname === '/') {
            console.log('🔐 AuthContext - Redirecionando usuário logado para dashboard');
            navigate('/dashboard');
          }
        } else {
          // Se Firebase retornou null e não há usuário local, definir como não logado
          console.log('🔐 AuthContext - Firebase retornou null, definindo como não logado');
          setUser(null);
          setLoading(false);
        }
      }, (error) => {
        console.error('🔐 AuthContext - Erro no observador de autenticação:', error);
        clearTimeout(timeoutId);
        setLoading(false);
      });

      console.log('🔐 AuthContext - Observador configurado com sucesso');

      return () => {
        console.log('🔐 AuthContext - Limpando observador...');
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (error) {
      console.error('🔐 AuthContext - Erro ao configurar observador:', error);
      setLoading(false);
    }
  }, [navigate]);

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin: isAdmin(user)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
