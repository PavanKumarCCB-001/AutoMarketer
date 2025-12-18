import React, { useState } from 'react';
import axios from 'axios';
import { Card, Button, Form, Spinner, Alert, Toast } from 'react-bootstrap';

function ContentGenerator({ products, userEmail, onGenerated }) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [generated, setGenerated] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleGenerate = async () => {
    if (!selectedProductId || !userEmail) {
      alert('Please select a product first And Login!');
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
      if (onGenerated) onGenerated();  // ← Add this line
      
    // window.location.reload(); Refresh history after generation
    } catch (err) {
      setGenerated('Error generating content. Check console or try again.');
      console.error(err);
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generated);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const selectedProduct = products.find(p => p.id === parseInt(selectedProductId));

  return (
    <Card className="mt-5 p-4 shadow">
      
      <Form.Group className="mb-3">
        <Form.Label>Select Product</Form.Label>
        <Form.Select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
          <option value="">-- Choose a product --</option>
          {products.map(prod => (
            <option key={prod.id} value={prod.id}>{prod.name}</option>
          ))}
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label>Platform</Form.Label>
        <Form.Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="instagram">Instagram Caption</option>
          <option value="linkedin">LinkedIn Post</option>
          <option value="email">Email Campaign</option>
          <option value="blog">Blog Summary</option>
        </Form.Select>
      </Form.Group>

      <Button onClick={handleGenerate} disabled={loading || !selectedProductId} variant="success" size="lg">
        {loading ? <><Spinner animation="border" size="sm" /> Generating...</> : 'Generate Content'}
      </Button>

      {generated && (
        <Card className="mt-4 p-3 bg-light">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <strong>{selectedProduct?.name} → {platform.charAt(0).toUpperCase() + platform.slice(1)}</strong>
              <pre className="mt-3 mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {generated}
              </pre>
            </div>
            <Button variant="outline-primary" size="sm" onClick={copyToClipboard}>
              Copy
            </Button>
          </div>
        </Card>)}

      <Toast show={showToast} onClose={() => setShowToast(false)} style={{ position: 'fixed', bottom: 20, right: 20 }}>
        <Toast.Body>Copied to clipboard!</Toast.Body>
      </Toast>
    </Card>
  );
}

export default ContentGenerator; 