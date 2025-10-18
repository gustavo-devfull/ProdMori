import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const Login = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError(t('Por favor, preencha todos os campos', '请填写所有字段'));
      return;
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
    } catch (error) {
      console.error('Erro no login:', error);
      
      // Mensagens de erro específicas
      switch (error.code) {
        case 'auth/user-not-found':
          setError(t('Usuário não encontrado', '用户未找到'));
          break;
        case 'auth/wrong-password':
          setError(t('Senha incorreta', '密码错误'));
          break;
        case 'auth/invalid-email':
          setError(t('Email inválido', '无效邮箱'));
          break;
        case 'auth/too-many-requests':
          setError(t('Muitas tentativas. Tente novamente mais tarde', '尝试次数过多，请稍后再试'));
          break;
        default:
          setError(t('Erro ao fazer login. Tente novamente', '登录失败，请重试'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <Card className="shadow">
              <Card.Body className="p-4">
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary">
                    {t('Sistema PMR', 'PMR系统')}
                  </h2>
                  <p className="text-muted">
                    {t('Faça login para continuar', '请登录以继续')}
                  </p>
                </div>

                {error && (
                  <Alert variant="danger" className="mb-3">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      {t('Email', '邮箱')}
                    </Form.Label>
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('Digite seu email', '输入您的邮箱')}
                      required
                      disabled={loading}
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>
                      {t('Senha', '密码')}
                    </Form.Label>
                    <Form.Control
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('Digite sua senha', '输入您的密码')}
                      required
                      disabled={loading}
                    />
                  </Form.Group>

                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        {t('Entrando...', '登录中...')}
                      </>
                    ) : (
                      t('Entrar', '登录')
                    )}
                  </Button>
                </Form>

                <div className="text-center mt-4">
                  <small className="text-muted">
                    {t('Acesso restrito a administradores', '仅限管理员访问')}
                  </small>
                </div>
              </Card.Body>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
