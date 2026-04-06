import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock } from 'lucide-react';
import './Auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { setUser } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('userInfo', JSON.stringify(data));
                setUser(data);
                navigate('/');
            } else if (res.status === 401) {
                setError(<>Invalid email or password. <b>Don't have an account? <Link to="/register" style={{color: 'var(--accent)'}}>Register here</Link></b></>);
            } else {
                setError(data.message || 'Something went wrong');
            }
        } catch (err) {
            console.error(err);
            setError('Could not connect to server');
        }
    };

    return (
        <div className="auth-container">
            <div className="glass-card auth-card">
                <div className="auth-header">
                    <div className="icon-wrapper">
                        <Lock size={32} color="var(--primary)" />
                    </div>
                    <h2>Welcome Back</h2>
                    <p className="text-muted">Sign in to continue to Invisible</p>
                </div>
                {error && <div className="error-message" style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
                <form onSubmit={handleSubmit} className="auth-form">
                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        className="input-field" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        className="input-field"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn-primary" style={{ marginTop: '10px' }}>Sign In</button>
                </form>
                <div className="auth-footer">
                    <span className="text-muted">Don't have an account? </span>
                    <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign Up</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
