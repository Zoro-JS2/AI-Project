import express from 'express';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// @route   POST /api/chats
// @desc    Create or get a chat
// @access  Protected
router.post('/', protect, async (req, res) => {
    const { userId, type } = req.body; // userId of the other participant

    if (!userId) {
        return res.status(400).json({ message: "UserId parameter is needed" });
    }

    try {
        let isChat = await Chat.findOne({
            type: type || 'regular',
            participants: { $all: [req.user._id, userId], $size: 2 }
        }).populate('participants', '-password');

        if (isChat) {
            res.json(isChat);
        } else {
            const chatData = {
                type: type || 'regular',
                participants: [req.user._id, userId]
            };

            const createdChat = await Chat.create(chatData);
            const fullChat = await Chat.findById(createdChat._id).populate('participants', '-password');
            res.status(200).json(fullChat);
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/chats
// @desc    Fetch all chats for a user
// @access  Protected
router.get('/', protect, async (req, res) => {
    try {
        const chats = await Chat.find({ participants: { $elemMatch: { $eq: req.user._id } } })
            .populate('participants', '-password')
            .sort({ updatedAt: -1 });
        res.status(200).json(chats);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/chats/:chatId/messages
// @desc    Fetch all messages for a chat
// @access  Protected
router.get('/:chatId/messages', protect, async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
            .populate('sender', 'username email')
            .populate('chat');
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/chats/messages
// @desc    Send a message
// @access  Protected
router.post('/messages', protect, async (req, res) => {
    const { content, chatId, mediaUrl, type } = req.body;

    if ((!content && !mediaUrl) || !chatId) {
        return res.status(400).json({ message: "Invalid data passed into request" });
    }

    const newMessage = {
        sender: req.user._id,
        content: content || "",
        chat: chatId,
        mediaUrl: mediaUrl,
        type: type || 'text'
    };

    try {
        let message = await Message.create(newMessage);
        message = await message.populate('sender', 'username');
        message = await message.populate({
            path: 'chat',
            populate: { path: 'participants', select: '-password' }
        });
        
        await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

        res.json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
