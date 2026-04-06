# 🕵️ Invisible Chat

A real-time secure chat application with support for **Secret Chats**, file/image sharing, voice messages, and an admin panel.

## ✨ Features

- 🔐 **Secret Chats** — auto-lock after 5 minutes of inactivity, unlock with your account password
- 💬 **Real-time messaging** via Socket.IO
- 🖼️ **Image & file sharing** with drag-and-drop support
- 🎙️ **Voice messages** (hold to record)
- 🔔 **Unread message badges** and toast notifications
- 🛡️ **Admin panel** for user management
- 🌙 **Dark mode** glassmorphism UI

## 🛠️ Tech Stack

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- JWT Authentication
- Multer (file uploads)
- Nodemailer (email OTP)

### Frontend
- React 18 + Vite
- Socket.IO Client
- React Router v6
- Lucide React (icons)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
node index.js
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## 📁 Project Structure

```
Invisible-chat/
├── backend/
│   ├── models/          # Mongoose models
│   ├── routes/          # Express routes (auth, chat, secret)
│   ├── middlewares/     # Auth middleware
│   ├── uploads/         # User uploaded files (gitignored)
│   └── index.js         # Entry point
└── frontend/
    └── src/
        ├── pages/       # React pages
        ├── context/     # Auth context
        └── main.jsx     # Entry point
```

## 🔒 Secret Chat Flow

1. Start a **Secret Chat** with any user
2. When you switch to another chat, a **5-minute timer** starts
3. After 5 minutes, the secret chat is **blurred and locked** in the sidebar
4. Click the locked chat → enter your **account password** to unlock

## 📄 License

MIT
