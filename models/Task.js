const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    user: {
        type: String
    },
    collection_id: {
        type: String,
        required: true
    },
    task: {
        type: String,
        required: true
    },
    dueDate: {
        type: Date,
        default: null
    },
    active: {
        type: Boolean,
        default: true
    }
}, {timestamps: true});

const Task = new mongoose.model('Tasks', TaskSchema);
module.exports = Task;