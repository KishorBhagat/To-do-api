const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const { handleAddNewTask, handleUpdateTask, handleDeleteTask, handleGetAllTask, handleGetSingleTask } = require('../controllers/tasksController')

// add task for the authenticated user
router.post('/', fetchuser, handleAddNewTask);

// Get all tasks of the authenticated user
router.get('/', fetchuser, handleGetAllTask);

// Get a single task of the authenticated user
router.get('/:id', fetchuser, handleGetSingleTask);

// Update notes of authenticated user
router.patch('/:id', fetchuser, handleUpdateTask);

// delete notes of the authenticated user
router.delete('/:id', fetchuser, handleDeleteTask);


module.exports = router;