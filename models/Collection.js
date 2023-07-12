const mongoose = require('mongoose');

const CollectionSchema = new mongoose.Schema({
    userId: {
        type: String
    },
    collection_name: {
        type: String,
        default: "default"
    },
}, {timestamps: true});

const Collection = new mongoose.model('Collections', CollectionSchema);

module.exports = Collection;