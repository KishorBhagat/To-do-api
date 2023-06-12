const express = require('express');
const router = express.Router();
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

const fetchuser = require('../middleware/fetchuser');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

const cookieParser = require('cookie-parser');
router.use(cookieParser());


const { handleLogin, handleSignup, handleVerifyEmail } = require('../controllers/authController');
const { handleRequestResetPassword, handleVerifyResetPassword, handleUpdatePassword } = require('../controllers/resetPasswordController');

// Signup user
router.post('/signup', handleSignup);

// Login user
router.post('/login', handleLogin);

// Verify user email
router.get('/verify/:userId/:uniqueString', handleVerifyEmail, );

// Get authenticated user
router.get('/user', fetchuser, async (req, res) => {
    try {
        const { userId, ...rest } = req.user;
        res.status(200).json(rest);
    } catch (error) {
        res.status(500).json({ error: error });
    }
})

// Request for password reset
router.post('/requestResetPassword', handleRequestResetPassword);

// Verify request for password reset
router.post('/verifyResetPassword', handleVerifyResetPassword);

// Reset or Update password
router.patch('/updatePassword', handleUpdatePassword);

module.exports = router;