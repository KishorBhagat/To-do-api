const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/', async (req, res) => {
    try {
        // const token = req.header('token')
        const refreshToken = req.body.refreshToken;
        const isValidRefreshToken = jwt.verify(refreshToken, process.env.JWT_SECRET, (error, decoded) => {
            if(error){
                return res.status(403).json({error})
            }
            const user = decoded.user;
            const newAccessToken = jwt.sign({
                token_type: "access",
                user
            }, process.env.JWT_SECRET, { expiresIn: "1h" });
    
            res.status(200).json({token: {access: newAccessToken}})
        });
    } catch (error) {
        res.status(500).json({error})
    }
});

module.exports = router;

