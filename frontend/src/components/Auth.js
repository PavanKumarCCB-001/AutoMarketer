import React, { useState } from 'react';
import axios from 'axios';
import { Form, Button, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function Auth() {
  const [username, setUsername] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [darkMode, setDarkMode] = useState(true);  // Default dark
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');

    const endpoint = isSignup ? '/signup' : '/login';
    const payload = isSignup ? { email, password, organization } : { email, password };

    try {
      const res = await axios.post(`${API_URL}${endpoint}`, payload);
      setMessage(res.data.message);
      
      if (isSignup) {
        // On signup: Show message, then switch to login
        setTimeout(() => {
          setIsSignup(false);
          setMessage('');
        }, 3000);  // 3 seconds delay for message
      } else {
        // On login: Save user and navigate
        const userData = {
          email: email,
          username: username || email.split('@')[0]  // fallback to part before @ if empty
        };
        localStorage.setItem('user', JSON.stringify(userData));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  };

  return (
    <div className={`auth-container ${darkMode ? '' : 'light-mode'}`}>
      {/* Theme Toggle Button */}
      <div
        className="theme-toggle-btn"
        onClick={toggleTheme}
      >
        {darkMode ? '🌙' : '☀️'}
      </div>

      <div className={`glass-modal ${darkMode ? '' : 'light'}`}>
        <h2 className="text-center mb-4">{isSignup ? 'Create Account' : 'Login'}</h2>

        {error && <div className="alert alert-danger">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <InputGroup>
              <InputGroup.Text className="glass-input">✉️</InputGroup.Text>
              <Form.Control
                type="email"
                className="glass-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="business@example.com"
              />
            </InputGroup>
          </Form.Group>

          {isSignup && (
            <Form.Group className="mb-3">
              <Form.Label>Organization (Optional)</Form.Label>
              <Form.Control
                type="text"
                className="glass-input"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="My MSME Store"
              />
            </Form.Group>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Username (Optional)</Form.Label>
            <Form.Control
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name or business name"
            />
          </Form.Group>                    

          <Form.Group className="mb-3">
            <Form.Label>Password</Form.Label>
            <InputGroup>
              <InputGroup.Text className="glass-input">🔒</InputGroup.Text>
              <Form.Control
                type="password"
                className="glass-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
              />
            </InputGroup>
          </Form.Group>

          {!isSignup && (
            <>
              <Form.Check
                type="checkbox"
                label="Remember me"
                className="mb-3"
                style={{ color: darkMode ? 'white' : 'black' }}
              />
              <div className="text-end mb-3">
                <a href="#" style={{ color: darkMode ? 'rgba(255,255,255,0.8)' : 'gray', cursor: 'pointer' }}
                  onClick={(e) => {
                      e.preventDefault();
                      if (window.confirm("\nThis feature is under development.\n\nWould you like to register a new account instead?")) {
                      setIsSignup(true); } }} > Forgot password? </a>
              </div>
            </>
          )}

          <Button variant={darkMode ? "light" : "dark"} size="lg" type="submit" className="w-100 mb-3">
            {isSignup ? 'Register' : 'Login'}
          </Button>

          <div className="text-center">
            <span style={{ color: darkMode ? 'rgba(255,255,255,0.8)' : 'gray' }}>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Button variant="link" className={darkMode ? "text-white" : "text-dark"} onClick={() => setIsSignup(!isSignup)}>
                {isSignup ? 'Login' : 'Register'}
              </Button>
            </span>
          </div>
        </Form>
      </div>
    </div>
  );
}

export default Auth;