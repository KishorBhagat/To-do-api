const express = require('express');
const router = express.Router();

const fetchuser = require('../middleware/fetchuser');

const { handleGetUser, handleDeleteUserAccount, handleUpdateUser } = require('../controllers/usersController');


// Get authenticated user
router.get('/user', fetchuser, handleGetUser);

// Update authenticated user account
router.patch('/user', fetchuser, handleUpdateUser);

// Delete authenticated user account
router.delete('/user', fetchuser, handleDeleteUserAccount);

module.exports = router;