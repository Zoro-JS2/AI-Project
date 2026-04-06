import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    type: {
        type: String,
        enum: ['regular', 'secret'],
        default: 'regular'
    },
    // Used for secret chats to determine if participants are active
    lastActive: {
        type: Map,
        of: Date,
        default: {} // Keyed by userId -> last active time
    }
}, { timestamps: true });

export default mongoose.model('Chat', ChatSchema);
