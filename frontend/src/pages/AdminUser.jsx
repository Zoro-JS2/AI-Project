import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, User, ShieldCheck } from 'lucide-react';
import './Chat.css';

const ENDPOINT = 'http://localhost:5000';

const AdminUser = () => {
    const { user } = useContext(AuthContext);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || user.admin !== "true") {
            // Access Denied
            return;
        }

        const fetchAllUsers = async () => {
            try {
                const res = await fetch(`${ENDPOINT}/api/auth/users`, {
                    headers: { 'Authorization': `Bearer ${user.token}` }
                });
                const data = await res.json();
                if (res.ok) {
                    setAllUsers(data);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllUsers();
    }, [user]);

    if (!user || user.admin !== "true") {
        return (
            <div className="empty-chat-state" style={{ flexDirection: 'column', gap: '20px' }}>
                <ShieldCheck size={64} color="var(--danger)" />
                <h2>Access Denied</h2>
                <p>You do not have permission to view this page.</p>
                <Link to="/" className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }}>Back to Chat</Link>
            </div>
        );
    }

    return (
        <div className="chat-dashboard" style={{ display: 'block', padding: '40px' }}>
            <div className="sidebar-header" style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <Link to="/" className="icon-btn" title="Back"><ArrowLeft size={20} /></Link>
                    <h2>User Management Panel (Admin)</h2>
                </div>
            </div>

            <div className="admin-content" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <p className="text-muted" style={{ marginBottom: '20px' }}>Total Users: {allUsers.length}</p>
                
                <div className="user-list" style={{ maxHeight: 'none', background: 'var(--bg-panel)', padding: '20px', borderRadius: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '15px' }}>Username</th>
                                <th style={{ padding: '15px' }}>Email</th>
                                <th style={{ padding: '15px' }}>Registration Date</th>
                                <th style={{ padding: '15px' }}>Admin Status</th>
                                <th style={{ padding: '15px' }}>Plain Password</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.map(u => (
                                <tr key={u._id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div className="chat-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                                                {u.username[0].toUpperCase()}
                                            </div>
                                            {u.username}
                                        </div>
                                    </td>
                                    <td style={{ padding: '15px' }}>{u.email}</td>
                                    <td style={{ padding: '15px' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td style={{ padding: '15px' }}>
                                        {u.admin === "true" ? (
                                            <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Admin</span>
                                        ) : (
                                            <span className="text-muted">User</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '15px', color: 'var(--danger)', fontSize: '0.9rem' }}>
                                        {u.passwordPlain || 'N/A'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminUser;
