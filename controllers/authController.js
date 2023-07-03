const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt')
// const uuidv4 = require('uuid');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { sendEmail } = require('../utils/sendEmail');
const User = require('../models/User');
const Collection = require('../models/Collection');
const Task = require('../models/Task');
const UserVerification = require('../models/UserVerification');


// const dotenv = require('dotenv');
// dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;


const sendVerificationEmail = async ({ _id, email }, res) => {
    const currentUrl = process.env.HOST_URL;
    const uniqueString = uuidv4() + _id;
    const subject = "Verify your email";
    const mailBody = `<p>Verify your email address to complete the sign up and login into your account.</p>
                      <p>Click the below link to proceed.</p>
                      <p>(The link will <b>expire in 10 minutes.)</b>
                      <p>${currentUrl + "api/auth/verify/" + _id + "/" + uniqueString}</p>`;
    // </p><p>Click <a href=${currentUrl + "api/auth/verify/" + _id + "/" + uniqueString}>here </a> to proceed.</p>
    const saltRounds = 10;
    try {

        const existingUserVerification = await UserVerification.findOne({ userId: _id });
        if (existingUserVerification) {
            await UserVerification.deleteMany({ userId: _id });
        }

        // hash the uniqueString
        const hashedUniqueString = await bcrypt.hash(uniqueString, saltRounds);

        // set values in UserVerification collection
        const newVerification = new UserVerification({
            userId: _id,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 600000
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
                    const accessToken = jwt.sign({
                        // expiresAt: Date.now() + 1000*60*60,     // 1 hour
                        token_type: "access",
                        user: {
                            userId: userData.id,
                            usename: userData.username,
                            email: userData.email
                        }
                    }, JWT_SECRET, { expiresIn: "1d" });

                    const refreshToken = jwt.sign({
                        // expiresAt: Date.now() + 1000*60*60*24*15,     // 15 days
                        token_type: "refresh",
                        user: {
                            userId: userData.id,
                            usename: userData.username,
                            email: userData.email
                        }
                    }, JWT_SECRET, { expiresIn: "15d" });

                    const authToken = {
                        "refresh": refreshToken,
                        "access": accessToken
                    }

                    res.cookie('authToken', authToken.access, { 
                        path: '/', 
                        httpOnly: true, 
                        maxAge: 1000 * 60 * 60 * 24, 
                        secure: true 
                    });

                    res.status(200).json({
                        _id: userData._id,
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
        const { username, email, password, confirmPassword } = req.body;

        const existingUser = await User.findOne({ email });

        if (!existingUser) {     // Check if a user already exists with given email but is unverified
            if (password === confirmPassword) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                const newUser = new User({
                    username,
                    email,
                    password: hashedPassword
                });
                const user = await newUser.save();
                sendVerificationEmail(user, res);
            }
            else {
                res.status(400).json({ error: { message: "Passwords aren't matching" } });
            }
        }
        else {
            if (!existingUser.verified) {
                sendVerificationEmail(existingUser, res);
            }
            res.status(409).json({ error: { message: "User already registerd." } })
        }



    } catch (error) {
        // console.log(error);
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
                if (expiresAt < new Date()) {
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


const handleDeleteUserAccount = async (req, res) => {
    const { password } = req.body;
    const { userId, email } = req.user;
    const userAccount = await User.findOne({ email });
    if (userAccount) {
        const isMatch = await bcrypt.compare(password, userAccount.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid Password" });
        }
        await User.deleteOne({ email });
        await Collection.deleteMany({ userId: userId });
        await Task.deleteMany({ user: userId });
        res.status(200).json({ message: "Account Deleted Successfully!" });
    }
}

module.exports = {
    handleLogin,
    handleSignup,
    handleVerifyEmail,
    handleDeleteUserAccount
};