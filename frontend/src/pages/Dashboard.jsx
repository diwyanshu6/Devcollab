import React, { useState, useEffect, useContext } from 'react';
import api from '../api';
import { AuthContext } from '../AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [workspaces, setWorkspaces] = useState([]);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { inviteCode } = useParams();

  useEffect(() => {
    if (inviteCode) {
      handleJoinWorkspace(inviteCode);
    } else {
      fetchWorkspaces();
    }
  }, [inviteCode]);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/workspaces');
      setWorkspaces(data.data);
    } catch (err) {
      setError('Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWorkspace = async (code) => {
    try {
      const { data } = await api.post(`/workspaces/join/${code}`);
      navigate(`/workspace/${data.data.workspaceId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid invite link');
      fetchWorkspaces();
      navigate('/');
    }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const { data } = await api.post('/workspaces', { name: newWorkspaceName });
      setWorkspaces([...workspaces, data.data]);
      setNewWorkspaceName('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create workspace');
    }
  };

  return (
    <div className="page-container" style={{ flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '28px', margin: 0 }}>DevCollab Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.name}</p>
        </div>
        <button className="btn-secondary" onClick={logout}>Sign Out</button>
      </header>
      
      {error && <div className="error-text" style={{ marginBottom: '20px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Create Workspace Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h3 style={{ marginBottom: '16px' }}>Create Workspace</h3>
          <form onSubmit={handleCreateWorkspace} style={{ display: 'flex', gap: '10px' }}>
            <input 
              className="input-field" 
              placeholder="Workspace Name" 
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
            />
            <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Create</button>
          </form>
        </div>

        {/* Workspace List */}
        {loading ? (
          <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="spinner"></span>
          </div>
        ) : workspaces.map(ws => (
          <div 
            key={ws.id} 
            className="glass-panel" 
            style={{ padding: '24px', cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column' }}
            onClick={() => navigate(`/workspace/${ws.id}`)}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <h3 style={{ fontSize: '20px', marginBottom: '8px', color: 'var(--accent-hover)' }}>{ws.name}</h3>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
              <span>Role: {ws.created_by === user.id ? 'Owner' : 'Member'}</span>
              <span>Join Workspace ➔</span>
            </div>
          </div>
        ))}
        
      </div>
    </div>
  );
}
