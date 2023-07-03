const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    user: {
        type: String
    },
    collection_name: {
        type: String,
        default: "default"
    },
    task: {
        type: String,
        required: true
    },
    active: {
        type: Boolean,
        default: true
    }
}, {timestamps: true});

const Task = new mongoose.model('Tasks', TaskSchema);
module.exports = Task;