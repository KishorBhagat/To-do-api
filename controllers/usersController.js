const bcrypt = require('bcrypt')
const User = require('../models/User');
const Collection = require('../models/Collection');
const Task = require('../models/Task');
const UserVerification = require('../models/UserVerification');
const cloudinary = require('../config/cloudinaryConfig');
const { v4: uuidv4 } = require('uuid');
const { sendEmail } = require('../utils/sendEmail');


const sendVerificationEmail = async ({ _id, newemail }, req, res) => {
    const origin = req.headers.origin;
    const currentUrl = process.env.HOST_URL;
    const uniqueString = uuidv4() + _id;
    const subject = "Verify your email";
    const mailBody = `<p>We got a request to change your current email. Verify your new email address to complete the process.</p>
                      <p>Click the below link to proceed.</p>
                      <p>${currentUrl + "api/user/verifyemail/" + _id + "/" + newemail + "/" + uniqueString + "/" + '?client=' + origin}</p>`;
                    //   <p>(The link will <b>expire in 10 minutes.)</b>
    try {

        const existingUserVerification = await UserVerification.findOne({ userId: _id });
        if (existingUserVerification) {
            await UserVerification.deleteMany({ userId: _id });
        }
        const saltRounds = 10;

        // hash the uniqueString
        const hashedUniqueString = await bcrypt.hash(uniqueString, saltRounds);

        // set values in UserVerification collection
        const newVerification = new UserVerification({
            userId: _id,
            // email: email,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 600000
        });
        const verificationData = await newVerification.save();
        sendEmail(newemail, subject, mailBody)

        res.status(200).json({
            status: "PENDING",
            message: "Verification link sent to your new email."
        });

    } catch (error) {
        console.log(error);
        res.json({ error });
    }
}

const handleGetUser = async (req, res) => {
    try {
        const { userId } = req.user;
        const user = await User.findById({ _id: userId });
        const { username, email, image, verified } = user;
        res.status(200).json({
            username,
            email,
            image,
            verified
        });
    } catch (error) {
        res.status(500).json({ error });
    }
}

const handleUpdateUser = async (req, res) => {
    try {
        const { userId } = req.user;
        const user = await User.findById({ _id: userId });
        const { _id, email, password, verified, ...rest } = req.body;
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: rest,
            },
            { new: true }
        );
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ error });
    }
}

const handleChangeEmail = async (req, res) => {
    const {userId} = req.user;
    const {newemail} = req.body;

    try {
        const user = await User.findById({_id: userId});
        const isExistingEmail = await User.findOne({email: newemail});
        if(isExistingEmail){
            return res.status(409).json({error: {message: 'This email is already registerd.'}})
        }
        else{
            sendVerificationEmail({_id: user._id, newemail: newemail }, req, res);
        }
    } catch (error) {
        console.log(error)
        res.status(500).json({error: {message: 'Internal server error.'}})
    }
}


const handleVerifyEmail = async (req, res) => {
    let { userId, newemail, uniqueString } = req.params;
    try {
        // const user = await User.findById(userId);
        const userVerification = await UserVerification.findOne({userId});
        const isMatch = await bcrypt.compare(uniqueString, userVerification.uniqueString);
        if(!isMatch){
            return res.status(401).json({error: {message: 'Unauthorized!'}});
        }
        await User.updateOne({ _id: userId }, { email: newemail });
        await UserVerification.deleteOne({userId});
        res.status(200).json({message: "Email changed successfully!"})
        // res.redirect(req.headers.origin);
    } catch (error) {
        console.log(error)
        res.status(500).json({error: {message: 'Internal server error!'}})
    }
}

const handleChangePassword = async (req, res) => {
    try {

        const authToken = req.header('authToken');
        const { userId } = req.user;
        const { currentpassword, newpassword, confirmNewPassword } = req.body;

        const userData = await User.findById({ _id: userId });
        const isMatch = await bcrypt.compare(currentpassword, userData.password);

        if (!isMatch) {
            return res.status(400).json({ error: { status: "FAILED", message: "Your current password is wrong." } })
        }

        if (newpassword !== confirmNewPassword) {
            return res.status(400).json({ error: { status: "FAILED", message: "New passwords aren't matching." } });
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newpassword, salt);
        await User.findByIdAndUpdate(
            userId,
            {
                password: hashedPassword
            },
            { new: true }
        );
        return res.status(200).json({ status: "SUCCESS", message: "Password changed successfully!" });

    } catch (error) {
        // console.log(error);
        return res.status(404).json({ error: { error, status: "FAILED", message: "Something went wrong!" } });
    }
}

const handleDeleteUserAccount = async (req, res) => {
    const { password } = req.body;
    const { userId, email } = req.user;
    try {
        const userAccount = await User.findOne({ email });
        if (userAccount) {
            const isMatch = await bcrypt.compare(password, userAccount.password);
            if (!isMatch) {
                return res.status(400).json({ error: { message: "Invalid Password" } });
            }
            await User.deleteOne({ email });
            await Collection.deleteMany({ userId: userId });
            await Task.deleteMany({ user: userId });
            res.status(200).json({ error: { message: "Account Deleted Successfully!" } });
        }
    } catch (error) {
        res.status(500).json({ error });
    }

}

const handleUploadImage = async (req, res) => {
    // console.log(req.file)
    try {
        cloudinary.uploader.upload(req.file.path, async (error, result) => {
            if (error) {
                console.log('Cloudinary upload error:', error);
                return res.status(500).json({ error: { message: 'Image upload failed' } });
            }

            const imageUrl = result.secure_url;

            const updateUserImage = await User.findByIdAndUpdate(
                req.user.userId,
                {
                    image: imageUrl
                },
                { new: true }
            );

            return res.status(200).json({ status: "SUCCESS", message: "Image uploaded successfully!", data: result });
        });
        // res.json({})
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: { message: "Internal server error" } });
    }

}

module.exports = {
    handleGetUser,
    handleUpdateUser,
    handleChangeEmail,
    handleVerifyEmail,
    handleChangePassword,
    handleDeleteUserAccount,
    handleUploadImage
};
