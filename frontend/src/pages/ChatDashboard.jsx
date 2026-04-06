import { useState, useEffect, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import io from 'socket.io-client';
import { LogOut, Plus, ShieldAlert, Send, Paperclip, Image as ImageIcon, X, ShieldCheck, Mic, Lock } from 'lucide-react';
import './Chat.css';

const ENDPOINT = 'http://localhost:5000';
let socket;

const ChatDashboard = () => {
    const { user, setUser } = useContext(AuthContext);
    const [chats, setChats] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socketConnected, setSocketConnected] = useState(false);
    const [showNewChatOverlay, setShowNewChatOverlay] = useState(false);
    
    // Notifications & Media
    const [unreadMessages, setUnreadMessages] = useState({});
    const [isDragging, setIsDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [toast, setToast] = useState(null);
    const fileInputRef = useRef(null);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [recorder, setRecorder] = useState(null);
    const [recordStartTime, setRecordStartTime] = useState(null);
    const longPressTimeout = useRef(null);
    const isSending = useRef(false); // Guard against double-send

    // Secret Chat mechanism
    // lockedChats: Set of chat IDs that are currently locked
    const [lockedChats, setLockedChats] = useState(new Set());
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [unlockingChatId, setUnlockingChatId] = useState(null);
    const [passwordEntry, setPasswordEntry] = useState('');
    const [unlockError, setUnlockError] = useState('');
    const lockTimers = useRef({}); // { chatId: timeoutId }

    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const selectedChatRef = useRef(null);

    // Toast helper
    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    // Keep reference to selected chat for socket listener
    useEffect(() => {
        selectedChatRef.current = selectedChat;
        if (selectedChat) {
            setUnreadMessages(prev => ({ ...prev, [selectedChat._id]: 0 }));
        }
    }, [selectedChat]);

    // Socket Connection
    useEffect(() => {
        if (!user) return;
        // Disconnect any previous socket before creating a new one
        if (socket) socket.disconnect();
        socket = io(ENDPOINT, { reconnectionAttempts: 5 });
        socket.emit('setup', user);
        socket.on('connected', () => setSocketConnected(true));

        // Remove old listener before adding new one (guards against StrictMode double-mount)
        socket.off('message received');
        socket.on('message received', (newMessageReceived) => {
            const currentSelected = selectedChatRef.current;
            if (!currentSelected || currentSelected._id !== newMessageReceived.chat._id) {
                setUnreadMessages(prev => ({
                    ...prev,
                    [newMessageReceived.chat._id]: (prev[newMessageReceived.chat._id] || 0) + 1
                }));
                showToast(`New message from ${newMessageReceived.sender.username}`);
            } else {
                // Deduplicate: don't add if message with this _id already exists
                setMessages(prev => {
                    if (prev.some(m => m._id === newMessageReceived._id)) return prev;
                    return [...prev, newMessageReceived];
                });
            }
        });

        return () => {
            socket.off('message received');
            socket.disconnect();
        };
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchChats();
            fetchUsers();
        }
    }, [user]);

    // When switching away from a secret chat — start 1-min lock timer
    const prevSelectedChatRef = useRef(null);
    useEffect(() => {
        const prev = prevSelectedChatRef.current;
        // If we are leaving a secret chat
        if (prev && prev.type === 'secret' && prev._id !== selectedChat?._id) {
            // Cancel any existing timer for this chat first
            if (lockTimers.current[prev._id]) clearTimeout(lockTimers.current[prev._id]);
            lockTimers.current[prev._id] = setTimeout(() => {
                setLockedChats(s => new Set(s).add(prev._id));
                delete lockTimers.current[prev._id];
            }, 5 * 60 * 1000); // 5 minute
        }
        // If we come back to a secret chat before the timer fires, cancel the timer
        if (selectedChat && selectedChat.type === 'secret' && lockTimers.current[selectedChat._id]) {
            clearTimeout(lockTimers.current[selectedChat._id]);
            delete lockTimers.current[selectedChat._id];
        }
        prevSelectedChatRef.current = selectedChat;
    }, [selectedChat]);

    const fetchChats = async () => {
        try {
            const res = await fetch(`${ENDPOINT}/api/chats`, { headers: { 'Authorization': `Bearer ${user.token}` } });
            const data = await res.json();
            if (res.ok) setChats(data);
        } catch (error) { console.error(error); }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${ENDPOINT}/api/auth/users`, { headers: { 'Authorization': `Bearer ${user.token}` } });
            const data = await res.json();
            if (res.ok) setUsers(data.filter(u => u._id !== user._id));
        } catch (error) { console.error(error); }
    };

    const fetchMessages = async (chatId) => {
        try {
            const res = await fetch(`${ENDPOINT}/api/chats/${chatId}/messages`, { headers: { 'Authorization': `Bearer ${user.token}` } });
            const data = await res.json();
            if (res.ok) {
                setMessages(data);
                socket.emit('join chat', chatId);
            }
        } catch (error) { console.error(error); }
    };

    const uploadFileAndSendMessage = async (file, type = 'image') => {
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${ENDPOINT}/api/chats/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                await sendMessageRequest(type === 'image' ? newMessage : '', data.url, type);
                if (type === 'image') {
                    setPreviewUrl(null);
                    setSelectedFile(null);
                    setNewMessage('');
                }
            }
        } catch (error) {
            console.error('Upload failed', error);
            showToast('Upload failed');
        }
    };

    const sendMessageRequest = async (content, mediaUrl = null, type = 'text') => {
        try {
            const res = await fetch(`${ENDPOINT}/api/chats/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ 
                    content: content, 
                    chatId: selectedChat._id,
                    mediaUrl: mediaUrl,
                    type: type
                })
            });
            const data = await res.json();
            if (res.ok) {
                socket.emit('new message', data);
                setMessages(prev => [...prev, data]);

            }
        } catch (error) {
            console.error(error);
        }
    };

    // --- Voice Recording Logic ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            let chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
                await uploadFileAndSendMessage(file, 'audio');
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setRecorder(mediaRecorder);
            setIsRecording(true);
            setRecordStartTime(Date.now());
            setNewMessage(''); // Clear input as requested
        } catch (err) {
            console.error('Could not start recording', err);
            showToast('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (recorder) {
            recorder.stop();
            setRecorder(null);
            setIsRecording(false);
            setRecordStartTime(null);
        }
    };

    const handleSendButtonMouseDown = () => {
        longPressTimeout.current = setTimeout(() => {
            startRecording();
        }, 500); // Trigger after 500ms
    };

    const handleSendButtonMouseUp = () => {
        if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
            longPressTimeout.current = null;
        }

        if (isRecording) {
            stopRecording();
        } else {
            handleSendMessage();
        }
    };

    const handleSendMessage = async (e) => {
        if (e && e.key && e.key !== 'Enter') return;
        if (isSending.current) return; // Prevent double-send
        isSending.current = true;
        try {
            if (selectedFile) {
                const fileToSend = selectedFile;
                // Clear preview immediately to prevent second trigger
                setPreviewUrl(null);
                setSelectedFile(null);
                await uploadFileAndSendMessage(fileToSend, 'image');
            } else {
                if (!newMessage.trim()) return;
                await sendMessageRequest(newMessage.trim());
                setNewMessage('');
            }
        } finally {
            isSending.current = false;
        }
    };

    const handleFileSelect = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const cancelPreview = () => {
        setPreviewUrl(null);
        setSelectedFile(null);
    };

    // Drag and Drop Handlers
    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleChatSelect = (chat) => {
        // If the chat is locked, show the unlock modal instead of opening it
        if (lockedChats.has(chat._id)) {
            setUnlockingChatId(chat._id);
            setPasswordEntry('');
            setUnlockError('');
            setShowUnlockModal(true);
            return;
        }
        setSelectedChat(chat);
        fetchMessages(chat._id);
    };

    const verifyPassword = async () => {
        setUnlockError('');
        try {
            const res = await fetch(`${ENDPOINT}/api/auth/verify-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email, password: passwordEntry })
            });
            if (res.ok) {
                // Unlock: remove from locked set, open chat
                setLockedChats(s => { const next = new Set(s); next.delete(unlockingChatId); return next; });
                setShowUnlockModal(false);
                const chatToOpen = chats.find(c => c._id === unlockingChatId);
                if (chatToOpen) {
                    setSelectedChat(chatToOpen);
                    fetchMessages(chatToOpen._id);
                }
                setPasswordEntry('');
                setUnlockingChatId(null);
            } else {
                const data = await res.json();
                setUnlockError(data.message || 'Неверный пароль');
            }
        } catch (err) { console.error(err); setUnlockError('Ошибка соединения'); }
    };

    const createChat = async (userId, type) => {
        try {
            const res = await fetch(`${ENDPOINT}/api/chats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${user.token}` },
                body: JSON.stringify({ userId, type })
            });
            const data = await res.json();
            if (res.ok) {
                if (!chats.find((c) => c._id === data._id)) setChats([data, ...chats]);
                handleChatSelect(data);
                setShowNewChatOverlay(false);
            }
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (!user) return null;

    const otherUser = selectedChat ? selectedChat.participants.find(p => p._id !== user._id) : null;

    return (
        <div className="chat-dashboard">
            {toast && <div className="toast-notification">{toast}</div>}
            
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2>Chats</h2>
                    <div className="sidebar-actions">
                        {user.admin === "true" && (
                            <Link to="/adminuser" className="icon-btn" title="Admin Panel" style={{ color: 'var(--primary)' }}>
                                <ShieldCheck size={20} />
                            </Link>
                        )}
                        <button className="icon-btn" onClick={() => setShowNewChatOverlay(true)}><Plus size={20} /></button>
                        <button className="icon-btn" onClick={() => { localStorage.removeItem('userInfo'); setUser(null); navigate('/login'); }}><LogOut size={20} /></button>
                    </div>
                </div>
                <div className="chat-list">
                    {chats.map(chat => {
                        const otherParticipant = chat.participants.find(p => p._id !== user._id);
                        const unreadCount = unreadMessages[chat._id] || 0;
                        const isLocked = lockedChats.has(chat._id);
                        return (
                            <div
                                key={chat._id}
                                className={`chat-item ${selectedChat?._id === chat._id ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
                                onClick={() => handleChatSelect(chat)}
                            >
                                <div className="chat-avatar">{otherParticipant?.username[0].toUpperCase()}</div>
                                <div className="chat-info">
                                    <div className="chat-name">
                                        {otherParticipant?.username} 
                                        {chat.type === 'secret' && <ShieldAlert size={14} color="var(--danger)" />}
                                        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
                                    </div>
                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{chat.type === 'secret' ? 'Secret Chat' : 'Active'}</div>
                                </div>
                                {isLocked && (
                                    <div className="chat-item-lock-overlay">
                                        <Lock size={13} />
                                        <span>Locked</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className={`main-chat ${isDragging ? 'dragging' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                {isDragging && <div className="drop-overlay"><ImageIcon size={48} /><p>Drop Image here</p></div>}
                
                {selectedChat ? (
                    <>
                        <div className="chat-header">
                            <div className="chat-avatar">{otherUser?.username[0].toUpperCase()}</div>
                            <div className="chat-info"><div className="chat-name">{otherUser?.username}</div></div>
                        </div>

                        <div className="messages-area">
                            {messages.map((m) => (
                                <div key={m._id} className={`message ${m.sender._id === user._id ? 'message-sent' : 'message-received'}`}>
                                    {m.type === 'image' && m.mediaUrl && <div className="message-image"><img src={m.mediaUrl} alt="media" onClick={() => window.open(m.mediaUrl, '_blank')} /></div>}
                                    {m.type === 'audio' && m.mediaUrl && <div className="message-audio"><audio controls src={m.mediaUrl} /></div>}
                                    {m.content && <p>{m.content}</p>}
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-container">
                            {isRecording && (
                                <div className="recording-status">
                                    <div className="pulse-dot"></div>
                                    <span>Recording Voice...</span>
                                </div>
                            )}
                            {previewUrl && (
                                <div className="image-preview-bar">
                                    <div className="preview-container">
                                        <img src={previewUrl} alt="preview" />
                                        <button className="cancel-preview" onClick={cancelPreview}><X size={16} /></button>
                                    </div>
                                </div>
                            )}
                            <div className="chat-input-area">
                                <button className="icon-btn" onClick={() => fileInputRef.current.click()}><Paperclip size={20} /></button>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => handleFileSelect(e.target.files[0])} />
                                <input className="chat-input" placeholder={isRecording ? "Listening..." : "Type a message..."} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleSendMessage} disabled={isRecording} />
                                <button 
                                    className={`send-btn ${isRecording ? 'recording' : ''}`} 
                                    onMouseDown={handleSendButtonMouseDown}
                                    onMouseUp={handleSendButtonMouseUp}
                                    onTouchStart={handleSendButtonMouseDown}
                                    onTouchEnd={handleSendButtonMouseUp}
                                >
                                    {isRecording ? <Mic size={20} /> : <Send size={20} />}
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="empty-chat-state">Select a chat or start a conversation</div>
                )}

                {showUnlockModal && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>🔒 Секретный чат заблокирован</h3>
                            <p>Введите пароль от вашего аккаунта для разблокировки.</p>
                            <input
                                className="input-field"
                                type="password"
                                placeholder="Пароль"
                                value={passwordEntry}
                                onChange={(e) => { setPasswordEntry(e.target.value); setUnlockError(''); }}
                                onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
                                autoFocus
                            />
                            {unlockError && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: '4px 0 0' }}>{unlockError}</p>}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button className="btn-primary" onClick={verifyPassword}>Войти</button>
                                <button className="btn-primary cancel-btn" onClick={() => { setShowUnlockModal(false); setPasswordEntry(''); setUnlockError(''); }}>Отмена</button>
                            </div>
                        </div>
                    </div>
                )}
                {showNewChatOverlay && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Start New Chat</h3>
                            <div className="user-list">
                                {users.map(u => (
                                    <div key={u._id} className="user-item">
                                        <span>{u.username}</span>
                                        <div className="user-actions">
                                            <button className="btn-primary mini" onClick={() => createChat(u._id, 'regular')}>Chat</button>
                                            <button className="btn-primary mini secret" onClick={() => createChat(u._id, 'secret')}>Secret</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="btn-primary" style={{marginTop: '10px'}} onClick={() => setShowNewChatOverlay(false)}>Close</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatDashboard;

