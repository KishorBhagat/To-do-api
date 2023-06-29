const mongoose = require('mongoose');

const PasswordResetSchema = new mongoose.Schema({
    userId: {
        type: String
    },
    email: {
        type: String
    },
    resetCode:{
        type: String
    },
    createdAt: {
        type: Date
    },
    expiresAt: {
        type: Date
    }
});

const PasswordReset = new mongoose.model('PasswordReset', PasswordResetSchema);
module.exports = PasswordReset;