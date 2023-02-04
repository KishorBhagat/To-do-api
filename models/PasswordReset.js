const mongoose = require('mongoose');

const PasswordResetSchema = new mongoose.Schema({
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