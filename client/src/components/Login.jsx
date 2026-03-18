// client/src/components/Login.jsx
import React, { useState } from 'react';
import { Container, Card, Form, Button, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { loginHandler } from '../api/API.mjs';
import '../css/Login.css';

export default function Login({ setLogin, setPlayer }) {
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    const username = event.target.elements['username-inserito']?.value;
    const password = event.target.elements['password-inserita']?.value;

    setLoading(true);
    setError('');
    try {
      const user = await loginHandler(username, password); // senza rememberMe
      setLogin(true);
      setPlayer(user || { username, monete: 0 });
      navigate('/game');
    } catch (err) {
      let message = 'Login fallito. Riprova.';
      if (typeof err === 'string') message = err;
      else if (Array.isArray(err)) message = err[0];
      else if (err && typeof err === 'object') message = err.message || JSON.stringify(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <Container className="login-container" style={{ maxWidth: '420px' }}>
        <Card className="login-card">
          <Card.Body>
            <div className="text-center mb-4">
              <img
                src="/immagini/logo.png"
                alt="Logo Indovina Frase"
                style={{ maxWidth: 120 }}
              />
              <h1 className="login-title">Effettua l'accesso</h1>
            </div>

            <Form onSubmit={handleSubmit}>
              <Form.Group controlId="username-inserito" className="mb-3">
                <Form.Label className="visually-hidden">Username</Form.Label>
                <Form.Control
                  type="text"
                  size="lg"
                  placeholder="Username"
                  autoComplete="username"
                />
              </Form.Group>

              <Form.Group controlId="password-inserita" className="mb-3">
                <Form.Label className="visually-hidden">Password</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    size="lg"
                    placeholder="Password"
                    autoComplete="current-password"
                  />
                  <Button
                    variant="outline-light"
                    className="toggle-password-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    type="button"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </Button>
                </InputGroup>
              </Form.Group>


              {error && <div className="text-danger mb-3">{error}</div>}

              <div className="d-grid mb-3">
                <Button type="submit" variant="primary" size="lg" disabled={loading}>
                  {loading ? 'Log in...' : 'Enter'}
                </Button>

                <Button
                  variant="outline-secondary"
                  size="lg"
                  className="mt-2"
                  disabled={loading}
                  onClick={() => navigate('/')}
                >
                  Torna alla Home
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
