import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, ListGroup, Badge, Button, Collapse } from 'react-bootstrap';

function DraftHistory({ userEmail, refreshTrigger }) {
  const [drafts, setDrafts] = useState([]);
  const [openDrafts, setOpenDrafts] = useState({});  // Track which are expanded

  useEffect(() => {
    if (!userEmail) return;
    fetchDrafts();
  }, [userEmail, refreshTrigger]);

  const fetchDrafts = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/drafts?user_email=${userEmail}`);
      setDrafts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleExpand = (id) => {
    setOpenDrafts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyDraft = (content) => {
    navigator.clipboard.writeText(content);
    alert('Copied! ✅');
  };

  if (drafts.length === 0) {
    return <div className="mt-4"><p>No drafts yet. Generate some content!</p></div>;
  }

  return (
    <Card className="mt-4 shadow">
      <div className="card-body">
        <h3>Your Generated Drafts History</h3>
        <ListGroup variant="flush">
          {drafts.map((draft) => (
            <ListGroup.Item key={draft.id} className="mb-3">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <strong>{draft.product_name} → {draft.type.charAt(0).toUpperCase() + draft.type.slice(1)}</strong>
                  <Badge bg="secondary" className="ms-2">
                    {new Date(draft.generated_at).toLocaleString()}
                  </Badge>
                  <pre className="mt-2 mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: '0.9em', maxHeight: '100px', overflow: 'hidden' }}>
                    {draft.content.substring(0, 200)} {draft.content.length > 200 ? '...' : ''}
                  </pre>
                </div>
                <div className="flex-shrink-0 d-flex align-items-start gap-2 flex-nowrap mt-2 mt-md-0">
                    <Button size="sm" variant="outline-info" onClick={() => toggleExpand(draft.id)} > 
                        {openDrafts[draft.id] ? '↑ Hide' : '↓ Show'}
                    </Button>
                    <Button size="sm" variant="outline-primary" onClick={() => copyDraft(draft.content)} >
                      Copy
                    </Button>
                </div>
              </div>

              <Collapse in={openDrafts[draft.id]}>
                <div className="mt-3 p-3 bg-light rounded">
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.95em' }}>
                    {draft.content}
                  </pre>
                </div>
              </Collapse>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </div>
    </Card>
  );
}

export default DraftHistory;