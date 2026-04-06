import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatDashboard from './pages/ChatDashboard';
import AdminUser from './pages/AdminUser';

function App() {
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<ChatDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/adminuser" element={<AdminUser />} />
      </Routes>
    </div>
  );
}

export default App;
