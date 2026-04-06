import express from 'express';
import nodemailer from 'nodemailer';
import { protect } from '../middlewares/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Store OTPs in memory for MVP (use Redis in prod)
const otpStore = new Map();

// Helper to generate a 6 digit PIN
const generatePIN = () => Math.floor(100000 + Math.random() * 900000).toString();

// Config Ethereal email
let transporter;
nodemailer.createTestAccount((err, account) => {
    if (err) {
        console.error('Failed to create a testing account. ' + err.message);
        return;
    }
    transporter = nodemailer.createTransport({
        host: account.smtp.host,
        port: account.smtp.port,
        secure: account.smtp.secure,
        auth: {
            user: account.user,
            pass: account.pass
        }
    });
});

// @route   POST /api/secrets/request-unlock
// @desc    Generate OTP and send to user's registered email
// @access  Protected
router.post('/request-unlock', protect, async (req, res) => {
    try {
        const user = req.user;
        const pin = generatePIN();
        
        otpStore.set(user._id.toString(), {
            pin,
            expires: Date.now() + 5 * 60 * 1000 // 5 min
        });

        const mailOptions = {
            from: '"Invisible Chat Security" <security@invisiblechat.com>',
            to: user.email,
            subject: 'Unlock Secret Chat - PIN Code',
            text: `Your PIN to unlock your secret chats is: ${pin}`,
            html: `<p>Your PIN to unlock your secret chats is: <b>${pin}</b></p>`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        res.json({ message: 'PIN sent to your email. (Check server logs for Ethereal URL if testing)' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @route   POST /api/secrets/verify
// @desc    Verify the PIN
// @access  Protected
router.post('/verify', protect, async (req, res) => {
    const { pin } = req.body;
    const userId = req.user._id.toString();

    const entry = otpStore.get(userId);

    if (!entry) {
        return res.status(400).json({ message: 'No OTP requested or it has expired' });
    }

    if (Date.now() > entry.expires) {
        otpStore.delete(userId);
        return res.status(400).json({ message: 'OTP expired' });
    }

    if (entry.pin === pin) {
        otpStore.delete(userId);
        return res.json({ success: true, message: 'OTP Verified' });
    } else {
        return res.status(400).json({ message: 'Invalid PIN' });
    }
});

export default router;
