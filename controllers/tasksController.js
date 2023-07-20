const Task = require('../models/Task');
const fetchuser = require('../middlewares/fetchuser');

const handleAddNewTask = async (req, res) => {
    try {
        const { task, collection_id, dueDate } = req.body;
        const data = new Task({ task, user: req.user.userId, collection_id, dueDate });
        const saveData = await data.save();
        res.status(200).json(data);
    } catch (error) {
        // console.log(error);
        res.status(500).json({ error });
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
                res.status(500).json({ error });
            }
        } else {
            res.status(401).json({ error: { message: "You can update only your task" } });
        }

    } catch (error) {
        // console.log(error);
        res.status(404).json({ error: { message: "Not found" } });
    }
}

const handleDeleteTask = async (req, res) => {
    try {
        let task = await Task.findById(req.params.id);
        if (task.user === req.user.userId) {
            await task.delete();
            res.status(200).json("Task deleted");
        } else {
            res.status(401).json({ error: { message: "You can delete only your task" } });
        }

    } catch (error) {
        res.status(404).json({ error: { message: "Not found" } });
    }
}

const handleGetAllTask = async (req, res) => {
    try {
        const { collection_name, task } = req.query;
        const queryObject = {};
        if (collection_name) {
            queryObject.collection_name = { $regex: collection_name, $options: 'i' };
        }
        if (task) {
            queryObject.task = { $regex: task, $options: 'i' };
        }
        const data = await Task.find({ user: req.user.userId, ...queryObject });
        // console.log(Object.keys(req.query).length)
        res.status(200).json(data);

    } catch (error) {
        console.log(error)
        res.status(500).json({ error });
    }
}

const handleGetSingleTask = async (req, res) => {
    try {
        console.log(req.params.id);

        const task = await Task.findById({ _id: req.params.id });
        if (req.user.userId === task.user) {
            res.status(200).json(task);
        }
        else {
            res.status(404).json({ error: { message: "Not Found" } });

        }

    } catch (error) {
        res.status(500).json({ error });
    }
}

module.exports = {
    handleAddNewTask,
    handleUpdateTask,
    handleDeleteTask,
    handleGetAllTask,
    handleGetSingleTask,
}