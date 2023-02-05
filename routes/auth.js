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
const PasswordReset = require('../models/PasswordReset');
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
        console.log(success);
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
});


router.post('/signup', async (req, res) => {
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
});

router.post('/login', async (req, res) => {
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
                    res.status(400).json({ message: "Invalid Credentials!" });
                }

            }

        }

    } catch (error) {
        // console.log({ error: error });
        res.status(500).json(error);
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


// send mail for passwor reset
const sendPasswordResetMail = async ({ _id, username, email }, code, passwordResetToken, res) => {
    const currentUrl = "http://localhost:5000/";
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Password recovery code",
        html: `<p>Hi <b>${username}</b>,</p>
                <p>We received a request to reset your To-do App password.</p>
                <p>Enter the following code to reset your password.</p>
                <h1>${code}</h1>
                <p>The code will expire in <b>10 minutes</b>.</p>`

    };

    try {
        const mail = await transporter.sendMail(mailOptions);
        res.json({
            status: "PENDING",
            message: "Password reset code sent to mail",
            token: passwordResetToken
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error });
    }
}


// request for reset password
router.post('/requestResetPassword', async (req, res) => {
    try {
        const userData = await User.findOne({ email: req.body.email });
        if (!userData) {
            res.status(404).json({ message: "User not found. If you don't have an account create one first." });
        }
        else {
            if (userData.verified != true) {
                res.status(401).json({ message: "Account hasn't been verified. Log in using a valid email." });
            }
            else {
                // Generate an OTP of 4 digit
                const code = (Math.floor(1000 + Math.random() * 9000)).toString();
                const salt = await bcrypt.genSalt(10);
                const hashedCode = await bcrypt.hash(code, salt);
                const newPasswordReset = new PasswordReset({
                    email: userData.email,
                    resetCode: hashedCode,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 10000
                });
                const passwordResetData = await newPasswordReset.save();

                const passwordResetToken = jwt.sign({
                    user: {
                        email: userData.email,
                    }
                }, JWT_SECRET);

                sendPasswordResetMail(userData, code, passwordResetToken, res);

            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error });
    }
});


// Verify code for reset password
router.post('/verifyResetPassword', async (req, res) => {
    try {

        const resetToken = req.header('resetToken');
        const data = jwt.verify(resetToken, JWT_SECRET);
        const email = data.user.email;

        const { resetCode } = req.body;
        const passwordResetData = await PasswordReset.findOne({ email });
        const userData = await User.findOne({ email });
        if (!passwordResetData) {
            res.status(400).json({ message: "Code not sent! The user may not be registerd." });
        }
        else {
            if (!( Date.now() > passwordResetData.expiresAt)) {
                // expired
                await PasswordReset.deleteOne({ email });
                res.status(410).json({  verified: false, status: 'EXPIRED', message: "The code is expired."  });
            }
            else {
                const verifyCode = await bcrypt.compare(resetCode, passwordResetData.resetCode);
                if (!verifyCode) {
                    res.status(400).json({
                        verified: false,
                        status: 'INVALID',
                        message: "Invalid code! Please check your email and enter the valid code."
                    });
                }
                else {
                    await PasswordReset.deleteOne({ email });
                    const passwordResetToken = jwt.sign({
                        user: {
                            id: userData._id,
                        }
                    }, JWT_SECRET);
                    res.status(200).json({
                        verified: true,
                        status: "VERIFIED",
                        message: "You can now reset your password.",
                        token: passwordResetToken
                    });
                }
            }
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error });
    }

});


// Reset password
router.patch('/updatePassword', async (req, res) => {
    try {

        const resetToken = req.header('resetToken');
        const data = jwt.verify(resetToken, JWT_SECRET);
        const id = data.user.id;

        const { newpassword, confirmNewPassword } = req.body;

        if(newpassword === confirmNewPassword){

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newpassword, salt);
            let user = await User.findById(id);
            const updateUser = await User.findByIdAndUpdate(
                id,
                {
                    password: hashedPassword
                },
                { new: true }
            );
            res.status(200).json({ status: "SUCCESS", message: "Password changed successfully!" });
        }
        else {
            res.status(400).json({ status: "FAILED", message: "Passwords aren't matching" });
        }

    } catch (error) {
        console.log(error);
        res.status(404).json({ error: "Not found", status: "FAILED", message: "Not found" });
    }
});


module.exports = router;