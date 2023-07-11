const mongoose = require('mongoose');

const UserVerificationSchema = new mongoose.Schema({
    userId: {
        type: String
    },
    email: {
        type: String
    },
    uniqueString:{
        type: String
    },
    createdAt: {
        type: Date
    },
    expiresAt: {
        type: Date
    }
});

const UserVerification = new mongoose.model('UserVerifications', UserVerificationSchema);
module.exports = UserVerification;