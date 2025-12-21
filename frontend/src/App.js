import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Navbar, Nav, Tab, Tabs } from 'react-bootstrap';
import axios from 'axios';

import Auth from './components/Auth';
import ProductManager from './components/ProductManager';
import ContentGenerator from './components/ContentGenerator';
import DraftHistory from './components/DraftHistory';

function ProtectedRoute({ children }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return user ? children : <Navigate to="/auth" replace />;
}

function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userEmail = user.email || '';
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [products, setProducts] = useState([]);
  const API_URL = 'http://localhost:5000';

  const fetchProducts = async () => {
    if (!userEmail) return;
    try {
      const res = await axios.get(`${API_URL}/products?user_email=${userEmail}`);
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [userEmail]);

  const handleProductAdded = () => {
    fetchProducts();
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    window.location.href = '/auth';
  };

  return (
    <>
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand>AutoMarketer</Navbar.Brand>
          <Nav className="ms-auto">
            <Nav.Link className="text-light">
  Welcome, {user.username || user.email.split('@')[0] || user.email}
</Nav.Link>
            <Nav.Link onClick={handleLogout} style={{ cursor: 'pointer' }}>
                Exit ➡️
            </Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <Container>
        <Tabs defaultActiveKey="home" className="mb-5 mt-3" justify>
          <Tab eventKey="home" title="Home">
            <div className="mt-4">
              <h2 className="display-6">Welcome to AutoMarketer</h2>
              <p className="lead">
                The AI-powered marketing agent built exclusively for MSMEs to maintain a consistent and engaging online presence — without the effort.
              </p>
              <div className="row mt-4">
                <div className="col-md-6">
                  <h5>✨ What It Does</h5>
                  <ul>
                    <li>Automatically generates platform-specific content (Instagram, LinkedIn, Email, Blog)</li>
                    <li>Tailors posts to your products, offers, and brand voice</li>
                    <li>Includes real-time trending hashtags for maximum reach</li>
                    <li>Saves all drafts for reuse</li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <h5>🚀 Why MSMEs Love It</h5>
                  <ul>
                    <li>No marketing team needed</li>
                    <li>Save hours every week</li>
                    <li>Stay active online consistently</li>
                    <li>Boost engagement with smart, trend-aware content</li>
                  </ul>
                </div>
              </div>
            </div>
          </Tab>

          <Tab eventKey="products" title="Products">
            <div className="mt-4">
              <h3>Manage Your Products</h3>
              <p>Add and manage products that power your AI-generated content.</p>
              <ProductManager onProductAdded={handleProductAdded} userEmail={userEmail} />
            </div>
          </Tab>

          <Tab eventKey="generate" title="Generate">
            <div className="mt-4">
              <h3>Generate Marketing Content</h3>
              <p>Select a product and platform to create engaging, trend-aware posts instantly.</p>
              <ContentGenerator products={products} userEmail={userEmail} onGenerated={() => setRefreshTrigger(prev => prev + 1)} />
              </div>
          </Tab>

          <Tab eventKey="history" title="History">
            <div className="mt-4">
              <h3>Your Generated Content History</h3>
              <p>All past generations for your account — reusable anytime.</p>
              <DraftHistory userEmail={userEmail} refreshTrigger={refreshTrigger} />
            </div>
          </Tab>
        </Tabs>
      </Container>
    </>
  ); }

function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/auth" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  ); }
export default App;