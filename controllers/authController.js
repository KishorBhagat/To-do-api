const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')
// const uuidv4 = require('uuid');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const {sendEmail} = require('../utils/sendEmail');
const User = require('../models/User');
const UserVerification = require('../models/UserVerification');


// const dotenv = require('dotenv');
// dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;


const sendVerificationEmail = async ({ _id, email }, res) => {
    const currentUrl = "https://to-do-api-7lgg.onrender.com/";
    const uniqueString = uuidv4() + _id;
    const subject = "Verify your email";
    const mailBody = `<p>Verify your email address to complete the sign up and login into your account.</p><p>This link will <b>expire in 10 minutes</b>.</p><p>Click <a href=${currentUrl + "api/auth/verify/" + _id + "/" + uniqueString}>here </a> to proceed.</p>`;

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
        sendEmail(email, subject, mailBody)

        res.json({
            status: "PENDING",
            message: "Verification email sent"
        });

    } catch (error) {
        console.log(error);
        res.json({ error: error });
    }
}



const handleLogin = async (req, res) => {
    try {
        const userData = await User.findOne({ email: req.body.email });
        if (!userData) {
            res.status(400).json({ message: "Invalid Credentials!" });
        }
        else {

            // check if th user is verified
            if (userData.verified != true) {
                res.status(401).json({ message: "Email hasn't been verified" });
            }
            else {

                const password = req.body.password;
                const isMatch = await bcrypt.compare(password, userData.password);
                if (isMatch) {
                    const authToken = jwt.sign({
                        // expiresAt: 24*60*60,
                        user: {
                            userId: userData.id,
                            usename: userData.username,
                            email: userData.email,
                        }
                    }, JWT_SECRET);

                    res.cookie('authToken', authToken, { httpOnly: true, maxAge: 1000*60*60*24 });

                    res.status(200).json({
                        usename: userData.username,
                        email: userData.email,
                        token: authToken
                    });
                }
                else {
                    res.status(400).json({ message: "Invalid Credentials!" });
                }

            }

        }

    } catch (error) {
        // console.log({ error: error });
        res.status(500).json(error);
    }
}

const handleSignup = async (req, res) => {
    try {
        const {password, confirmPassword} = req.body;

        if(password === confirmPassword){
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const newUser = new User({
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword
            });
            const user = await newUser.save();
            sendVerificationEmail(user, res);
        }
        else {
            res.status(400).json({ message: "Passwords aren't matching" });
        }

        
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error });
    }
}

const handleVerifyEmail = (req, res) => {
    let { userId, uniqueString } = req.params;

    UserVerification.find({ userId })
        .then((result) => {
            if (result.length > 0) {
                // user verification record exists so we proceed
                const { expiresAt } = result[0];
                const hashedUniqueString = result[0].uniqueString;

                if (!(expiresAt < Date.now())) {
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
}

module.exports = {
    handleLogin,
    handleSignup,
    handleVerifyEmail
};