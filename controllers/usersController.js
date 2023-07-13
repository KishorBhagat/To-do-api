const bcrypt = require('bcrypt')
const User = require('../models/User');
const Collection = require('../models/Collection');
const Task = require('../models/Task');

const handleGetUser = async (req, res) => {
    try {
        const { userId } = req.user;
        const user = await User.findById({_id: userId});
        const {username, email, image, verified} = user;
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
        const user = await User.findById({_id: userId});
        const { _id, email, password, verified, ...rest} = req.body;
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


module.exports = {
    handleGetUser,
    handleUpdateUser,
    handleDeleteUserAccount,
};