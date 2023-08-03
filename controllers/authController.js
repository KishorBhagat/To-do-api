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


const sendVerificationEmail = async (user, req, res) => {
    const { _id, email, username } = user;
    const origin = req.headers.origin;
    const currentUrl = process.env.HOST_URL;
    const uniqueString = uuidv4() + _id;
    const subject = "Verify your email";
    const mailBody = `<body style="background-color: #f0efef;">
                        <div style=" border-radius: 2px; padding: 20px;">
                            <h1>Verify This Email Address</h1>
                            <p>Hi ${username.split(' ')[0]},</p>
                            <p>Welcome to Task App!</p>
                            <p>Please click the button below to verify your email address.<br>(It will <b>expire in 10 minutes.)</b></p>
                            <p>Thanks,<br>Kishor Bhagat</p><br>
                            <a href="${currentUrl + "api/auth/verify/" + _id + "/" + uniqueString + '/?login=' + origin}" style="text-align: center; display: block;" target="_blank"><button style="background-color: #129dff; color: #fff; border: none; padding: 10px 20px; border-radius: 2px; font-size: 12px; cursor: pointer;">Verify Email</button></a>
                        </div>
                      </body>`;
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
            email: email,
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
        // console.log(error);
        res.json({ error });
    }
}



const handleLogin = async (req, res) => {
    try {
        const userData = await User.findOne({ email: req.body.email });
        if (!userData) {
            res.status(400).json({ error: { message: "Invalid Credentials!" } });
        }
        else {

            // check if th user is verified
            if (userData.verified != true) {
                res.status(401).json({ error: { message: "Email hasn't been verified" } });
            }
            else {

                const password = req.body.password;
                const isMatch = await bcrypt.compare(password, userData.password);
                if (isMatch) {
                    const accessToken = jwt.sign({
                        token_type: "access",
                        user: {
                            userId: userData.id,
                            username: userData.username,
                            email: userData.email
                        }
                    }, JWT_SECRET, { expiresIn: "600000" });

                    const refreshToken = jwt.sign({
                        token_type: "refresh",
                        user: {
                            userId: userData.id,
                            username: userData.username,
                            email: userData.email
                        }
                    }, JWT_SECRET, { expiresIn: "15d" });

                    const authToken = {
                        "refresh": refreshToken,
                        "access": accessToken
                    }

                    res.cookie('refreshToken', authToken.refresh, {
                        path: '/',
                        httpOnly: true,
                        maxAge: 1000 * 60 * 60 * 24 * 15,
                        secure: true,
                        sameSite: 'None'
                    })

                    res.status(200).json({
                        _id: userData._id,
                        username: userData.username,
                        email: userData.email,
                        token: authToken
                    });
                }
                else {
                    res.status(400).json({ error: { message: "Invalid Credentials!" } });
                }

            }

        }

    } catch (error) {
        // console.log({ error: error });
        res.status(500).json({ error });
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
                sendVerificationEmail(user, req, res);
            }
            else {
                res.status(400).json({ error: { message: "Passwords aren't matching" } });
            }
        }
        else {
            if (!existingUser.verified) {
                sendVerificationEmail(existingUser, req, res);
            }
            else {
                res.status(409).json({ error: { message: "A user with this email is already registerd." } })
            }
        }



    } catch (error) {
        console.log(error);
        res.status(500).json({ error });
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
                                            .then(async () => {
                                                const initialCollections = [
                                                    { userId, collection_name: 'default' },
                                                    { userId, collection_name: 'personal' },
                                                    { userId, collection_name: 'school' },
                                                    { userId, collection_name: 'shopping' },
                                                    { userId, collection_name: 'wishlist' },
                                                ]
                                                await Collection.insertMany(initialCollections)
                                                res.sendFile(path.join(__dirname, "../views/verified.html"))
                                            })
                                            .catch(error => {
                                                // console.log(error);
                                                let message = "An error occured while finalizing successful verification"
                                                res.redirect(`/api/auth/verified/error=true&message=${message}`);
                                            })
                                    })
                                    .catch(error => {
                                        // console.log(error);
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
            // console.log(error);
            let message = "An error occured while checking the current user verification record";
            res.redirect(`/api/auth/verified/error=true&message=${message}`);
        })
}




const handleLogout = async (req, res) => {
    res.cookie('refreshToken', '', {
        path: '/',
        httpOnly: true,
        maxAge: 1000,
        secure: true,
        sameSite: 'None'
    });
    res.status(200).json({ message: 'logged out successfull' });
}

module.exports = {
    handleLogin,
    handleSignup,
    handleVerifyEmail,
    handleLogout
};