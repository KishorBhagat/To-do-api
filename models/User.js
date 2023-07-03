const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username:{
        type: String,
        required: true,
        unique: false
    },
    email:{
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true
    },
    // date: {
    //     type: Date,
    //     default: Date.now()
    // },
    verified: {
        type: Boolean,
        default: false
    }
}, {timestamps: true});

const User = new mongoose.model('User', UserSchema);
module.exports = User;