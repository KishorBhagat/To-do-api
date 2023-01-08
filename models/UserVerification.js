const mongoose = require('mongoose');

const UserVerificationSchema = new mongoose.Schema({
    userId: {
        type: String
    },
    uniqueString:{
        type: String
    },
    createdAt: {
        type: Date
    },
    createdAt: {
        type: Date
    }
});

const UserVerification = new mongoose.model('UserVerifications', UserVerificationSchema);
module.exports = UserVerification;