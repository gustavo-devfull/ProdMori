import React, { useState } from 'react';
import { Button, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

const CreateAdminUser = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [createdUsers, setCreatedUsers] = useState([]);
  const navigate = useNavigate();

  const adminUsers = [
    { email: 'gutopc@gmail.com', password: '@RaviMori147' },
    { email: 'vinicius@ravi.com.br', password: '@RaviMori147' },
    { email: 'cotacao@ravi.com.br', password: '@RaviMori147' }
  ];

  const createAdmins = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      setCreatedUsers([]);

      const results = [];
      
      for (const admin of adminUsers) {
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            admin.email, 
            admin.password
          );
          results.push({ email: admin.email, success: true, uid: userCredential.user.uid });
        } catch (error) {
          if (error.code === 'auth/email-already-in-use') {
            results.push({ email: admin.email, success: true, message: 'já existe' });
          } else {
            results.push({ email: admin.email, success: false, error: error.message });
          }
        }
      }

      setCreatedUsers(results);
      
      const successCount = results.filter(r => r.success).length;
      setMessage(`${successCount} usuário(s) admin processado(s) com sucesso!`);
      
      // Redirecionar para dashboard após 3 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      
    } catch (error) {
      setError(`Erro geral: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <Card className="w-100" style={{ maxWidth: '500px' }}>
        <Card.Body className="p-4">
          <h3 className="text-center mb-4">Criar Usuário Admin</h3>
          
          {message && (
            <Alert variant="success" className="mb-3">
              {message}
            </Alert>
          )}
          
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <div className="text-center">
            <p className="mb-3">
              <strong>Usuários Admin:</strong><br/>
              <small>
                <strong>gutopc@gmail.com</strong> / @RaviMori147<br/>
                <strong>vinicius@ravi.com.br</strong> / @RaviMori147<br/>
                <strong>cotacao@ravi.com.br</strong> / @RaviMori147
              </small>
            </p>
            
            {createdUsers.length > 0 && (
              <div className="mb-3">
                {createdUsers.map((result, index) => (
                  <div key={index} className={`small p-2 mb-1 rounded ${result.success ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                    <strong>{result.email}:</strong> {result.success ? (result.message || 'Criado com sucesso!') : result.error}
                  </div>
                ))}
              </div>
            )}
            
            <Button 
              variant="primary" 
              onClick={createAdmins}
              disabled={loading}
              size="lg"
            >
              {loading ? 'Criando...' : 'Criar Usuários Admin'}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CreateAdminUser;
