const express = require('express');
const router = express.Router();

const fetchuser = require('../middlewares/fetchuser');
const upload = require('../middlewares/multer');

const { handleGetUser, handleDeleteUserAccount, handleUpdateUser, handleUploadImage } = require('../controllers/usersController');


// Get authenticated user
router.get('/', fetchuser, handleGetUser);

// Update authenticated user account
router.patch('/', fetchuser, handleUpdateUser);

// Delete authenticated user account
router.delete('/', fetchuser, handleDeleteUserAccount);

// Upload authenticated user's image
router.post('/profile/upload', fetchuser, upload.single('image'), handleUploadImage);

module.exports = router;
