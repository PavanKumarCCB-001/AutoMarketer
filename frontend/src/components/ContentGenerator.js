import React, { useState } from 'react';
import axios from 'axios';
import { Card, Button, Form, Spinner, Toast } from 'react-bootstrap';

function ContentGenerator({ products, userEmail, onGenerated }) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [generated, setGenerated] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [recipient, setRecipient] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleGenerate = async () => {
    if (!selectedProductId || !userEmail) {
      alert('Please select a product and login first!');
      return;
    }
    setLoading(true);
    setGenerated('');
    try {
      const res = await axios.post(`${API_URL}/generate`, {
        product_id: parseInt(selectedProductId),
        platform: platform,
        user_email: userEmail
      });
      setGenerated(res.data.content);
      if (onGenerated) onGenerated();
    } catch (err) {
      setGenerated('Error generating content. Try again.');
      console.error(err);
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generated);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handlePostSocial = async () => {
    const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));
    const productName = selectedProduct?.name || 'product';

    try {
      const res = await axios.post(`${API_URL}/post_social`, { 
        content: generated, 
        platform,
        product_name: productName  // ← Sends product name for relevant image
      });
      alert('Posted to ' + platform + ' successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      alert('Post failed: ' + errorMsg);
      console.error(err);
    }
  };

  const handleSendEmail = async () => {
    if (!recipient.trim()) {
      alert('Please enter recipient email');
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/send_email`, { 
        content: generated, 
        recipient 
      });
      alert('Email sent successfully!');
      setRecipient('');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
      alert('Send failed: ' + errorMsg);
    }
  };

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));

  return (
    <Card className="mt-5 p-4 shadow">
      <h3>Generate Marketing Content</h3>

      <Form.Group className="mb-3">
        <Form.Label>Select Product</Form.Label>
        <Form.Select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
          <option value="">-- Choose a product --</option>
          {products.map(prod => (
            <option key={prod.id} value={prod.id}>{prod.name}</option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-4">
        <Form.Label>Choose Platform</Form.Label>
        <div className="d-flex flex-wrap gap-3 justify-content-center">
          <Button
            variant={platform === 'instagram' ? 'primary' : 'outline-primary'}
            onClick={() => setPlatform('instagram')}
            className="d-flex flex-column align-items-center p-3"
            style={{ width: '120px' }}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" alt="Instagram" width="50" height="50" />
            <small className="mt-2">Instagram</small>
          </Button>

          <Button
            variant={platform === 'linkedin' ? 'primary' : 'outline-primary'}
            onClick={() => setPlatform('linkedin')}
            className="d-flex flex-column align-items-center p-3"
            style={{ width: '120px' }}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" alt="LinkedIn" width="50" height="50" />
            <small className="mt-2">LinkedIn</small>
          </Button>

          <Button
            variant={platform === 'email' ? 'primary' : 'outline-primary'}
            onClick={() => setPlatform('email')}
            className="d-flex flex-column align-items-center p-3"
            style={{ width: '120px' }}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_(2020).svg" alt="Email" width="50" height="50" />
            <small className="mt-2">Email</small>
          </Button>
        </div>
      </Form.Group>

      {platform === 'email' && (
        <Form.Group className="mb-3">
          <Form.Label>Recipient Email</Form.Label>
          <Form.Control 
            type="email" 
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="recipient@example.com"
          />
        </Form.Group>
      )}

      <Button onClick={handleGenerate} disabled={loading || !selectedProductId} variant="success" size="lg" className="w-100">
        {loading ? <><Spinner animation="border" size="sm" /> Generating...</> : 'Generate Content'}
      </Button>

      {generated && (
        <Card className="mt-4 p-4 bg-light">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <strong>{selectedProduct?.name} → {platform.charAt(0).toUpperCase() + platform.slice(1)}</strong>
            <Button variant="outline-primary" size="sm" onClick={copyToClipboard}>
              Copy
            </Button>
          </div>

          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
            {generated}
          </pre>

          <div className="mt-4 d-flex flex-wrap gap-2 justify-content-center">
            {(platform === 'instagram' || platform === 'linkedin') && (
              <Button variant="success" onClick={handlePostSocial}>
                Post to {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </Button>
            )}

            {platform === 'email' && (
              <Button variant="success" onClick={handleSendEmail} disabled={!recipient.trim()}>
                Send Email
              </Button>
            )}
          </div>
        </Card>
      )}

      <Toast show={showToast} onClose={() => setShowToast(false)} style={{ position: 'fixed', bottom: 20, right: 20 }}>
        <Toast.Body>Copied to clipboard! ✅</Toast.Body>
      </Toast>
    </Card>
  );
}

export default ContentGenerator;