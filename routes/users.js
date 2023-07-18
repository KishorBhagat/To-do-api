const express = require('express');
const router = express.Router();

const fetchuser = require('../middlewares/fetchuser');
const upload = require('../middlewares/multer');

const { handleGetUser, handleDeleteUserAccount, handleChangeEmail, handleVerifyEmail, handleChangePassword, handleUpdateUser, handleUploadImage } = require('../controllers/usersController');


// Get authenticated user
router.get('/', fetchuser, handleGetUser);

// Update authenticated user's account
router.patch('/', fetchuser, handleUpdateUser);

// Change authenticated user's email
router.post('/changeemail', fetchuser, handleChangeEmail);

// Verify change email
router.get('/verifyemail/:userId/:newemail/:uniqueString', handleVerifyEmail);

// Change authenticated user's password
router.patch('/changepassword', fetchuser, handleChangePassword);

// Delete authenticated user's account
router.delete('/', fetchuser, handleDeleteUserAccount);

// Upload authenticated user's image
router.post('/profile/upload', fetchuser, upload.single('image'), handleUploadImage);

module.exports = router;
