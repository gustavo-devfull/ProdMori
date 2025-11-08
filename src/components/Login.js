import React, { useState } from 'react';
import { Card, Form, Button, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="login-container">
      <div 
        className="login-background"
        style={{
          backgroundImage: `url(${process.env.PUBLIC_URL || ''}/fundo-5a55dd7a.jpg)`
        }}
      >
        <div className="login-overlay"></div>
      </div>
      
      <div className="login-content">
        {/* Logo and Title above the card */}
        <div className="login-top-section">
          <div className="login-logo-container">
            <img 
              src="/RAVI-LOGO-COLOR.svg" 
              alt="RAVI Logo" 
              className="login-logo"
            />
          </div>
          <h1 className="login-page-title">
            {t('Cotações Online', '在线报价')}
          </h1>
        </div>

        {/* Login Card */}
        <div className="login-card-wrapper">
          <Card className="login-card">
            <Card.Body className="login-card-body">
              {error && (
                <Alert variant="danger" className="login-alert">
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit} className="login-form">
                <Form.Group className="login-form-group">
                  <Form.Label className="login-label">
                    {t('E-mail', '邮箱')}
                  </Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('Digite seu email', '输入您的邮箱')}
                    className="login-input"
                    required
                    disabled={loading}
                  />
                </Form.Group>

                <Form.Group className="login-form-group">
                  <Form.Label className="login-label">
                    {t('Senha', '密码')}
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('Digite sua senha', '输入您的密码')}
                      className="login-input"
                      required
                      disabled={loading}
                    />
                    <InputGroup.Text 
                      className="login-password-toggle"
                      onClick={() => !loading && setShowPassword(!showPassword)}
                      role="button"
                      tabIndex={0}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !loading) {
                          setShowPassword(!showPassword);
                        }
                      }}
                    >
                      <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                    </InputGroup.Text>
                  </InputGroup>
                </Form.Group>

                <Button 
                  type="submit" 
                  className="login-button"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      {t('Entrando...', '登录中...')}
                    </>
                  ) : (
                    <>
                      {t('Entrar', '登录')}
                      <i className="bi bi-arrow-right ms-2"></i>
                    </>
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
