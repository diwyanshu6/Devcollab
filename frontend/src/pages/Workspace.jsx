import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import api from '../api';
import { io } from 'socket.io-client';

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useContext(AuthContext);

  const [workspace, setWorkspace] = useState(null);
  const [messages, setMessages] = useState([]);
  const [notes, setNotes] = useState([]);
  const [members, setMembers] = useState([]);
  const [draftMessage, setDraftMessage] = useState('');
  const [draftNote, setDraftNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // chat, notes, members
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchWorkspaceData();
    initSocket();
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [id]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const initSocket = () => {
    socketRef.current = io('http://localhost:5000', {
      auth: { token }
    });
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_workspace', id);
    });
    socketRef.current.on('receive_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });
    socketRef.current.on('error', (err) => {
      console.error('Socket error:', err);
    });
  };

  const fetchWorkspaceData = async () => {
    try {
      setLoading(true);
      const [wsData, msgsData, notesData, membersData] = await Promise.all([
        api.get(`/workspaces/${id}`),
        api.get(`/chats/${id}`),
        api.get(`/notes/${id}`),
        api.get(`/workspaces/${id}/members`)
      ]);
      setWorkspace(wsData.data.data);
      setMessages(msgsData.data.data);
      setNotes(notesData.data.data);
      setMembers(membersData.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Access Denied');
      if (err.response?.status === 403 || err.response?.status === 404) {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!draftMessage.trim()) return;
    
    // Optimistic UI update could go here, but relying on server is safer.
    socketRef.current.emit('send_message', { workspaceId: id, message: draftMessage });
    setDraftMessage('');
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!draftNote.trim()) return;
    try {
      const { data } = await api.post(`/notes/${id}`, { content: draftNote });
      setNotes([data.data, ...notes]);
      setDraftNote('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/notes/${noteId}`);
      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting note');
    }
  };

  const handleStartEdit = (note) => {
    setEditingNoteId(note.id);
    setEditNoteContent(note.content);
  };

  const handleSaveEdit = async (noteId) => {
    try {
      const { data } = await api.put(`/notes/${noteId}`, { content: editNoteContent });
      setNotes(notes.map(n => n.id === noteId ? data.data : n));
      setEditingNoteId(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating note');
    }
  };

  const generateInviteLink = async () => {
  try {
    const { data } = await api.put(`/workspaces/${id}/invite_code`);
    const code = data.data.invite_code;

    const link = `${import.meta.env.VITE_FRONTEND_URL}/join/${code}`;

    await navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
  } catch (err) {
    alert('Error generating invite link');
  }
};

  const handleDeleteWorkspace = async () => {
    if (!window.confirm("Are you sure you want to delete this workspace? This action is permanent!")) return;
    try {
      await api.delete(`/workspaces/${id}`);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting workspace');
    }
  };

  if (loading) return <div className="page-container" style={{ justifyContent: 'center', alignItems: 'center' }}><span className="spinner"></span></div>;
  if (!workspace) return <div className="page-container">Error loading workspace</div>;

  const isOwner = workspace.created_by === user.id;

  return (
    <div className="page-container" style={{ flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Header */}
      <header className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0 }}>{workspace.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {members.length} members
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {isOwner && (
            <>
              <button className="btn-secondary" style={{ background: 'var(--danger)', color: 'white' }} onClick={handleDeleteWorkspace}>
                Delete Workspace
              </button>
              <button className="btn-secondary" style={{ background: 'var(--accent-primary)', color: 'white' }} onClick={generateInviteLink}>
                Copy Invite Link
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={() => navigate('/')}>Back to Dashboard</button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, gap: '24px', overflow: 'hidden' }}>
        
        {/* Sidebar Tabs */}
        <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {['chat', 'notes', 'members'].map(tab => (
            <div 
              key={tab}
              className="glass-panel"
              style={{ padding: '16px', cursor: 'pointer',textTransform: 'capitalize', background: activeTab === tab ? 'rgba(99, 102, 241, 0.2)' : 'rgba(30, 41, 59, 0.7)' }}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Dynamic Panel */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '20px' }}>
          
          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
                {messages.map(msg => {
                  const isMine = msg.user_id === user.id;
                  return (
                    <div key={msg.id || Math.random()} style={{ alignSelf: isMine ? 'flex-end' : 'flex-start', maxWidth: '70%', background: isMine ? 'var(--accent-secondary)' : 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '12px', color: isMine ? '#cbd5e1' : 'var(--text-secondary)', marginBottom: '4px' }}>{isMine ? 'You' : msg.name}</div>
                      <div>{msg.message}</div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px' }}>
                <input 
                  className="input-field" 
                  style={{ flex: 1 }} 
                  placeholder="Type a message..." 
                  value={draftMessage}
                  onChange={e => setDraftMessage(e.target.value)}
                />
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>Send</button>
              </form>
            </>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '16px', overflowY: 'auto', alignContent: 'flex-start', paddingRight: '8px' }}>
              <form onSubmit={handleCreateNote} style={{ width: '100%', display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <textarea 
                  className="input-field" 
                  placeholder="New note... (Press Enter to save, Shift+Enter for new line)" 
                  value={draftNote}
                  onChange={e => setDraftNote(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCreateNote(e);
                    }
                  }}
                  style={{ minHeight: '60px', resize: 'vertical' }}
                />
                <button type="submit" className="btn-primary" style={{ width: 'auto', alignSelf: 'flex-start' }}>Add Note</button>
              </form>
              
              {notes.map(note => (
                <div key={note.id} className="glass-panel" style={{ width: '100%', padding: '16px', background: 'var(--bg-tertiary)', borderLeft: '4px solid var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  
                  {editingNoteId === note.id ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', marginRight: '16px' }}>
                      <textarea 
                        className="input-field" 
                        value={editNoteContent}
                        onChange={e => setEditNoteContent(e.target.value)}
                        style={{ minHeight: '80px', resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-primary" style={{ padding: '8px 16px', width: 'auto', fontSize: '14px' }} onClick={() => handleSaveEdit(note.id)}>Save</button>
                        <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }} onClick={() => setEditingNoteId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <span style={{ whiteSpace: 'pre-wrap', flex: 1 }}>{note.content}</span>
                  )}
                  
                  {note.user_id === user.id && editingNoteId !== note.id && (
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginLeft: '12px' }}>
                      <span style={{ color: 'var(--accent-hover)', cursor: 'pointer', fontSize: '14px', fontWeight: '500' }} onClick={() => handleStartEdit(note)}>Edit</span>
                      <span style={{ color: 'var(--danger)', cursor: 'pointer', fontSize: '24px', lineHeight: 1 }} onClick={() => handleDeleteNote(note.id)}>×</span>
                    </div>
                  )}
                </div>
              ))}
              {notes.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No notes available.</p>}
            </div>
          )}

          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {members.map(member => (
                <div key={member.id} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ display: 'block' }}>{member.name} {member.id === user.id && '(You)'}</strong>
                    <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{member.email}</span>
                  </div>
                  {workspace.created_by === member.id && <span style={{ padding: '4px 8px', background: 'rgba(99,102,241,0.2)', color: 'var(--accent-hover)', borderRadius: '4px', fontSize: '12px' }}>Owner</span>}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
