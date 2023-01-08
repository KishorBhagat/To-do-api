const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');
const Task = require('../models/Task');
const UserVerification = require('../models/UserVerification');
const fetchuser = require('../middleware/fetchuser');

dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;


let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASSWORD,
    },
});

transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    }
    else {
        console.log("Ready for messages");
        console.log("Success");
    }
});

// Send verification email
const sendVerificationEmail = async ({ _id, email }, res) => {
    const currentUrl = "http://localhost:5000/";
    const uniqueString = uuidv4() + _id;
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Verify your email",
        html: `<p>Verify your email address to complete the sign up and login into your account.</p><p>This link will <b>expire in 10 minutes</b>.</p><p>Click <a href=${currentUrl + "api/auth/verify/" + _id + "/" + uniqueString}>here </a> to proceed.</p>`
    };

    const saltRounds = 10;
    try {
        // hash the uniqueString
        const hashedUniqueString = await bcrypt.hash(uniqueString, saltRounds);
            
        // set values in UserVerification collection
        const newVerification = new UserVerification({
            userId: _id,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 10000
        });
        const verificationData = await newVerification.save();
        const mail = await transporter.sendMail(mailOptions);
        res.json({
            status: "PENDING",
            message: "Verification email sent"
        });
         
    } catch (error) {
        console.log(error);
        res.json({ error: error });
    }   
}

// verify email
router.get("/verify/:userId/:uniqueString", (req, res) => {
    let { userId, uniqueString } = req.params;

    UserVerification.find({ userId })
        .then((result) => {
            if (result.length > 0) {
                // user verification record exists so we proceed
                const { expiresAt } = result[0];
                const hashedUniqueString = result[0].uniqueString;

                if (expiresAt < Date.now()) {
                    // record has expired so we delete it
                    UserVerification.deleteOne({ userId })
                        .then(result => {
                            User.deleteOne({ _id: userId })
                                .then(() => {
                                    let message = "Link has expired. Please sign up again.";
                                    res.redirect(`/api/auth/verified/error=true&message=${message}`);
                                })
                                .catch((error) => {
                                    let message = "Clearing user with experied unique string failed";
                                    res.redirect(`/api/auth/verified/error=true&message=${message}`);
                                })
                        })
                        .catch((error) => {
                            let message = "An error occured while clearing expired user verification record";
                            res.redirect(`/api/auth/verified/error=true&message=${message}`);
                        })
                }
                else {
                    // valid record exists so we validate the user string
                    bcrypt.compare(uniqueString, hashedUniqueString)
                        .then(result => {
                            if (result) {
                                // string matches
                                User.updateOne({ _id: userId }, { verified: true })
                                    .then(() => {
                                        UserVerification.deleteOne({ userId })
                                            .then(() => {
                                                res.sendFile(path.join(__dirname, "../views/verified.html"))
                                            })
                                            .catch(error => {
                                                console.log(error);
                                                let message = "An error occured while finalizing successful verification"
                                                res.redirect(`/api/auth/verified/error=true&message=${message}`);
                                            })
                                    })
                                    .catch(error => {
                                        console.log(error);
                                        let message = "An error occured while updating user record to show verified."
                                        res.redirect(`/api/auth/verified/error=true&message=${message}`);
                                    })
                            }
                            else {
                                // existing record but incorrect verification details passed.
                                let message = "Invalid verification details passed. Check your inbox."
                                res.redirect(`/api/auth/verified/error=true&message=${message}`);
                            }
                        })
                        .catch(error => {
                            let message = "An error occured while comparing unique strings"
                            res.redirect(`/api/auth/verified/error=true&message=${message}`);
                        })
                }
            }
            else {
                // user verification record doesn't exist
                let message = "Account record doesn't exist or has been verified already. Please sign up or login.";
                res.redirect(`/api/auth/verified/error=true&message=${message}`);
            }
        })
        .catch((error) => {
            console.log(error);
            let message = "An error occured while checking the current user verification record";
            res.redirect(`/api/auth/verified/error=true&message=${message}`);
        })
});

// verified page route
// router.get('/verified', (req, res) => {
//     res.sendFile(path.join(__dirname, "../views/verified.html"))
// });




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
        // res.status(200).json(user);
        sendVerificationEmail(user, res);
    } catch (error) {
        res.status(500).json({ error: error });
        // console.log(error);
    }
});

router.post('/login', async (req, res) => {
    try {
        const userData = await User.findOne({ email: req.body.email });
        if (!userData) {
            res.status(400).json({ error: "Invalid Credentials" });
        }
        else {

            // check if th user is verified
            if (userData.verified != true) {
                res.status(401).json({ error: "Email hasn't been verified" });
            }
            else {


                const password = req.body.password;
                const isMatch = await bcrypt.compare(password, userData.password);
                if (isMatch) {
                    const authToken = jwt.sign({
                        user: {
                            userId: userData.id,
                            usename: userData.username,
                            email: userData.email,
                        }
                    }, JWT_SECRET);

                    // res.status(200).json(authToken);
                    res.status(200).json({
                        usename: userData.username,
                        email: userData.email,
                        token: authToken
                    });
                }
                else {
                    res.status(400).json({ error: "Invalid Credentials" });
                }



            }

        }

    } catch (error) {
        res.status(500).json(error);
        console.log({ error: error });
    }
});

router.get('/getuser', fetchuser, async (req, res) => {
    try {
        const { userId, ...rest } = req.user;
        res.status(200).json(rest);
    } catch (error) {
        res.status(500).json({ error: error });
    }
})




module.exports = router;