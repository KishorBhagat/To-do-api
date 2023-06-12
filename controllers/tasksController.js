const Task = require('../models/Task');
const fetchuser = require('../middleware/fetchuser');

const handleAddNewTask = async (req, res) => {
    try {
        const { task } = req.body;
        const data = new Task({ task, user: req.user.userId });
        const saveData = await data.save();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error });
        console.log(error);
    }
}

const handleUpdateTask = async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if (task.user === req.user.userId) {
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
                res.status(500).json({ error: error });
            }
        } else {
            res.status(401).json("You can update only your task");
        }

    } catch (error) {
        res.status(404).json({ error: "Not found" });
        console.log(error);
    }
}

const handleDeleteTask = async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if (task.user === req.user.userId) {
            await task.delete();
            res.status(200).json("Task deleted");
        } else {
            res.status(401).json("You can delete only your task");
        }

    } catch (error) {
        res.status(404).json({ error: "Not found" });
    }
}

const handleGetAllTask = async (req, res) => {
    try {
        const allTasks = await Task.find({ user: req.user.userId });
        res.status(200).json(allTasks);

    } catch (error) {
        res.status(500).json({ error: error });
    }
}

const handleGetSingleTask = async (req, res) => {
    try {
        const task = await Task.findById({ _id: req.params.id });
        if (req.user.userId === task.user) {
            res.status(200).json(task);
        }
        else {
            res.status(404).json({ error: "Not Found" });

        }

    } catch (error) {
        res.status(500).json({ error: error });
    }
}

module.exports = {
    handleAddNewTask,
    handleUpdateTask,
    handleDeleteTask,
    handleGetAllTask,
    handleGetSingleTask
}