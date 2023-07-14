const express = require('express');
const router = express.Router();
const fetchuser = require('../middlewares/fetchuser');
const { handleAddNewCollection, handleUpdateCollection, handleDeleteCollection, handleGetAllCollections, handleGetSingleCollection } = require('../controllers/collectionsController');


// add collection for the authenticated user
router.post('/', fetchuser, handleAddNewCollection);

// Get all collections of the authenticated user
router.get('/', fetchuser, handleGetAllCollections);

// Get a single collection of the authenticated user
router.get('/:id', fetchuser, handleGetSingleCollection);

// Update collection of authenticated user
router.patch('/:id', fetchuser, handleUpdateCollection);

// delete collection of the authenticated user
router.delete('/:id', fetchuser, handleDeleteCollection);

module.exports =  router