const express = require('express');
const router = express.Router();
// const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');

const fetchuser = require('../middleware/fetchuser');

// dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

const cookieParser = require('cookie-parser');
router.use(cookieParser());


const { handleLogin, handleSignup, handleVerifyEmail, handleLogout } = require('../controllers/authController');
const { handleRequestResetPassword, handleVerifyResetPassword, handleUpdatePassword } = require('../controllers/resetPasswordController');

// Signup user
router.post('/signup', handleSignup);

// Login user
router.post('/login', handleLogin);

// Verify user email
router.get('/verify/:userId/:uniqueString', handleVerifyEmail, );

// Request for password reset
router.post('/requestResetPassword', handleRequestResetPassword);

// Verify request for password reset
router.post('/verifyResetPassword', handleVerifyResetPassword);

// Reset or Update password
router.patch('/updatePassword', handleUpdatePassword);

// Logout user
router.post('/logout', handleLogout);

module.exports = router;