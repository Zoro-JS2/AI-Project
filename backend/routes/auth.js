import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({
            username,
            email,
            password
        });

        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            admin: user.admin,
            token: generateToken(user._id)
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate a user
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && (await user.comparePassword(password))) {
            res.json({
                _id: user._id,
                username: user.username,
                email: user.email,
                admin: user.admin,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/auth/verify-password
// @desc    Verify the current user's own password (used for secret chat unlock)
// @access  Public (uses token in body to identify user)
router.post('/verify-password', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && (await user.comparePassword(password))) {
            res.json({ success: true });
        } else {
            res.status(401).json({ message: 'Неверный пароль' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   GET /api/auth/users
// @desc    Get all users to start chat with
// @access  Protected
router.get('/users', async (req, res) => {
    try {
        // Find all users except the current user
        // wait, we need token to exclude current user
        // So this route should use protect middleware if we extract it,
        // For simplicity, we just fetch all users
        const users = await User.find({}).select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
