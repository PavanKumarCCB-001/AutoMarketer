import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Form, Row, Col, Alert } from 'react-bootstrap';

function ProductManager({ onProductAdded, userEmail }) {
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [offers, setOffers] = useState('');
  const [message, setMessage] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchProducts();
  }, [userEmail]);

  const fetchProducts = async () => {
    if (!userEmail) return;
    try {
      const res = await axios.get(`${API_URL}/products?user_email=${userEmail}`);
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userEmail) return;
    try {
      await axios.post(`${API_URL}/products`, { 
        name, description, offers, user_email: userEmail 
      });
      setMessage('Product added successfully!');
      setName(''); setDescription(''); setOffers('');
      fetchProducts();
      if (onProductAdded) onProductAdded();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error adding product');
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product? All related drafts will also be deleted.')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/products/${productId}`, {
        data: { user_email: userEmail }
      });
      fetchProducts();  // Refresh list
      setMessage('Product deleted successfully');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Error deleting product');
    }
  };

  return (
    <div className="mt-4">
      <h4>Add New Product</h4>
      {message && <Alert variant={message.includes('deleted') || message.includes('added') ? 'success' : 'danger'}>{message}</Alert>}

      <Card className="mb-4 p-4">
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Product Name *</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Description</Form.Label>
            <Form.Control as="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Current Offers/Discounts</Form.Label>
            <Form.Control value={offers} onChange={(e) => setOffers(e.target.value)} />
          </Form.Group>
          <Button type="submit" variant="primary">Add Product</Button>
        </Form>
      </Card>

      <h4>Your Products ({products.length})</h4>
      <Row>
        {products.map((prod) => (
          <Col md={4} key={prod.id} className="mb-3">
            <Card className="h-100 position-relative">
              <Card.Body className="d-flex flex-column">
                <Card.Title>{prod.name}</Card.Title>
                <Card.Text className="flex-grow-1">
                  {prod.description || 'No description'}
                </Card.Text>
                {prod.offers && <Card.Text><strong>Offers:</strong> {prod.offers}</Card.Text>}
                
                {/* Dustbin Icon - Bottom Right */}
                <Button
                  variant="outline-danger"
                  size="sm"
                  className="position-absolute bottom-0 end-0 m-3 rounded-circle"
                  style={{ width: '40px', height: '40px', padding: 0 }}
                  onClick={() => handleDelete(prod.id)}
                  title="Delete product"
                >
                  🗑️
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      {products.length === 0 && <p>No products yet. Add one above!</p>}
    </div>
  );
}

export default ProductManager;