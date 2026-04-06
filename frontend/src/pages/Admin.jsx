import { Shield } from 'lucide-react';
import './Auth.css'; // Reusing styles

const Admin = () => {
    return (
        <div className="auth-container">
            <div className="glass-card auth-card" style={{ maxWidth: '600px', textAlign: 'center' }}>
                <div className="auth-header">
                    <div className="icon-wrapper">
                        <Shield size={32} color="var(--danger)" />
                    </div>
                    <h2>Admin Dashboard</h2>
                    <p className="text-muted">This page is a placeholder for future admin settings.</p>
                </div>
                
                <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <p>Metrics, User Management, and App Configuration will be displayed here.</p>
                </div>
            </div>
        </div>
    );
};

export default Admin;
