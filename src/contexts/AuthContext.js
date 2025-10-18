import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Redirecionar para dashboard após login bem-sucedido
      navigate('/dashboard');
      return userCredential.user;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Função de logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  };

  // Verificar se o usuário é admin
  const isAdmin = (user) => {
    const adminEmails = ['gutopc@gmail.com', 'vinicius@ravi.com.br', 'cotacao@ravi.com.br'];
    return user && adminEmails.includes(user.email);
  };

  // Observar mudanças no estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      // Se o usuário estiver logado e estiver na página de login, redirecionar para dashboard
      if (user && window.location.pathname === '/') {
        navigate('/dashboard');
      }
    });

    return unsubscribe;
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
