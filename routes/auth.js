const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

const User = require('../models/User');
const Task = require('../models/Task');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/signup', async (req, res) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);
        const newUser = new User({
            username: req.body.username,
            email: req.body.email,
            password: hashedPassword
        });
        const user = await newUser.save();
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

router.post('/login', async (req, res) => {
    try {
        const userData = await User.findOne({ email: req.body.email });
        if (!userData) {
            res.status(400).json({ error: "Invalid Credentials" });
        }
        else {
            const password = req.body.password;
            const isMatch = await bcrypt.compare(password, userData.password);
            if (isMatch) {
                const authToken = jwt.sign({
                    user: {
                        userId : userData.id,
                        usename : userData.username,
                        email: userData.email,
                    }
                }, JWT_SECRET);

                // res.status(200).json(authToken);
                res.status(200).json({
                    usename : userData.username,
                    email: userData.email,
                    token: authToken
                });
            }
            else {
                res.status(400).json({ error: "Invalid Credentials" });
            }
        }
 
    } catch (error) {
        res.status(500).json(error);
        console.log(error);
    }
});


module.exports = router;