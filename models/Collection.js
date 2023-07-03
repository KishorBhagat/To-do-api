const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
    userId: {
        type: String
    },
    collection_name: {
        type: String,
        default: "default"
    },
    total_tasks: {
        type: Number,
        default: 0
    },
    total_finished: {
        type: Number,
        default: 0
    },
}, {timestamps: true});

const Collection = new mongoose.model('Collections', CollectionSchema);

module.exports = Collection;