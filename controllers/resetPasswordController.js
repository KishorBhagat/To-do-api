const bcrypt = require('bcrypt');
const PasswordReset = require('../models/PasswordReset');
const { sendEmail } = require('../utils/sendEmail');
const jwt = require('jsonwebtoken');
const User = require('../models/User');


// const dotenv = require('dotenv');
// dotenv.config();
const JWT_SECRET = process.env.JWT_SECRET;

// Function to send mail for password reset
const sendPasswordResetMail = async ({ _id, username, email }, code, passwordResetToken, res) => {
    const currentUrl = "https://to-do-api-7lgg.onrender.com/";
    const subject = "Password recovery code";
    const mailBody = `<p>Hi <b>${username}</b>,</p>
                      <p>We received a request to reset your To-do App password.</p>
                      <p>Enter the following code to reset your password.</p>
                      <h1>${code}</h1>
                      <p>The code will expire in <b>10 minutes</b>.</p>
                      `;
    //   <p>Click <a href="http://localhost:3000/code">here</a> to enter otp.</p>

    try {
        sendEmail(email, subject, mailBody);
        res.json({
            status: "PENDING",
            message: "A security code is sent to your email. Please check your email.",
            token: passwordResetToken
        });

    } catch (error) {
        // console.log(error);
        res.status(500).json({ error });
    }
}

const handleRequestResetPassword = async (req, res) => {
    try {
        const userData = await User.findOne({ email: req.body.email });
        if (!userData) {
            res.status(404).json({ error: { message: "User not found. If you don't have an account create one first." } });
        }
        else {
            if (userData.verified != true) {
                res.status(401).json({ error: { message: "Account hasn't been verified. Log in using a valid email." } });
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
                    expiresAt: Date.now() + 600000
                });
                // Check if an OTP already exists for the same requested email in PasswordReset collection
                if (await PasswordReset.findOne({ email: req.body.email })) {
                    await PasswordReset.deleteMany({ email: req.body.email });
                }

                const passwordResetData = await newPasswordReset.save();

                const passwordResetToken = jwt.sign({
                    // expiresAt: new Date() + 60000,
                    user: {
                        email: userData.email,
                    }
                }, JWT_SECRET);

                sendPasswordResetMail(userData, code, passwordResetToken, res);

            }
        }
    } catch (error) {
        // console.log(error);
        res.status(500).json({ error });
    }
}

// Verify code for reset password
const handleVerifyResetPassword = async (req, res) => {
    try {

        const resetToken = req.header('resetToken');
        const data = jwt.verify(resetToken, JWT_SECRET);
        const email = data.user.email;

        const { resetCode } = req.body;
        const passwordResetData = await PasswordReset.findOne({ email });
        const userData = await User.findOne({ email });
        if (!passwordResetData) {
            res.status(400).json({ error: { message: "Code not sent! The user may not be registerd." } });
        }
        else {

            if ((passwordResetData.expiresAt < Date.now())) {
                // expired
                await PasswordReset.deleteOne({ email });
                res.status(410).json({ error: { verified: false, status: 'EXPIRED', message: "The code is expired." } });
            }
            else {
                const verifyCode = await bcrypt.compare(resetCode, passwordResetData.resetCode);
                if (!verifyCode) {
                    res.status(400).json({
                        error: {
                            verified: false,
                            status: 'INVALID',
                            message: "Invalid code! Please check your email and enter the valid code."
                        }
                    });
                }
                else {
                    await PasswordReset.deleteOne({ email });
                    const passwordResetToken = jwt.sign({
                        user: {
                            id: userData._id,
                        }
                    }, JWT_SECRET, { expiresIn: "600000ms" });    // expiresIn: 10 min
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
        // console.log(error);
        res.status(500).json({ error: { status: "FAILED", message: "Passwords aren't matching" } });
    }
}

// Reset password
const handleUpdatePassword = async (req, res) => {
    try {

        const resetToken = req.header('resetToken');
        const data = jwt.verify(resetToken, JWT_SECRET);
        const id = data.user.id;

        const { newpassword, confirmNewPassword } = req.body;

        if (newpassword === confirmNewPassword) {

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
            return res.status(200).json({ status: "SUCCESS", message: "Password changed successfully!" });
        }
        else {
            return res.status(400).json({ error: { status: "FAILED", message: "Passwords aren't matching" } });
        }

    } catch (error) {
        // console.log(error);
        return res.status(404).json({ error: { error, status: "FAILED", message: "Something went wrong!" } });
    }
}

module.exports = {
    handleRequestResetPassword,
    handleVerifyResetPassword,
    handleUpdatePassword
}