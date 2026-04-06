import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
    },
    mediaUrl: {
        type: String, // Future feature
    },
    type: {
        type: String,
        enum: ['text', 'image', 'audio'],
        default: 'text'
    }
}, { timestamps: true });

export default mongoose.model('Message', MessageSchema);
