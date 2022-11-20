const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Task = require('../models/Task');
const dotenv = require('dotenv');
dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

const fetchuser = (req, res, next) => {
    // Get the user from the jwt token and append and add id to req object
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({error: "Please authenticate using a valid token"});
    }
    try {
        const data = jwt.verify(token, JWT_SECRET);
        req.user = data.user;
        next();
        
    } catch (error) {
        res.status(401).send({error: "Please authenticate using a valid token"});
    }
}

// add task for the authenticated user
router.post('/addtask', fetchuser, async (req, res, next) => {
    try {
        const {task} = req.body;
        const data = new Task({task, user: req.user.userId});
        const saveData = await data.save();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error });
        console.log(error);
    }    
});

// Get all tasks of the authenticated user
router.get('/gettasks', fetchuser, async (req, res) => {
    try {
        const allTasks = await Task.find({user: req.user.userId});
        res.status(200).json(allTasks);

    } catch (error) {
        res.status(500).json({ error: error });
}
});

// Get a single task of the authenticated user
router.get('/gettasks/:id', fetchuser, async (req, res) => {
    try {
        const task = await Task.findById({_id: req.params.id});
        if(req.user.userId === task.user){
            res.status(200).json(task);
        }
        else{
            res.status(404).json("Not Found");

        }

    } catch (error) {
        res.status(500).json({ error: error });
}
});

// Update notes of authenticated user
router.patch('/:id', fetchuser, async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if(task.user === req.user.userId){
            try {
                const updatedTask = await Task.findByIdAndUpdate(
                    req.params.id,
                    {
                        $set: req.body,
                    },
                    { new: true }
                );
                res.status(200).json(updatedTask);
            } catch (error) {
                res.status(500).json(error);
            }
        } else{
            res.status(401).json("You can update only your task");
        }

    } catch (error) {
        res.status(404).json({ error: "Not found" });
        console.log(error);
}
});

// delete notes of the authenticated user
router.delete('/:id', fetchuser, async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if(task.user === req.user.userId){
            await task.delete();
            res.status(200).json("Task deleted");
        } else{
            res.status(401).json("You can delete only your task");
        }

    } catch (error) {
        res.status(404).json({ error: "Not found" });
}
});


module.exports = router;