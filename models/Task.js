const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    user: {
        type: String
    },
    task: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    active: {
        type: Boolean,
        default: true
    }
});

const Task = new mongoose.model('Tasks', TaskSchema);
module.exports = Task;