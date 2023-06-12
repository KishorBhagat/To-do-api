const nodemailer = require('nodemailer');

// transporter.verify((error, success) => {
//     if (error) {
//         console.log(error);
//     }
//     else {
//         console.log("Ready for messages");
//         console.log(success);
//     }
// });

const sendEmail = async (receiverEmail, subject, body) => {
    try {
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.AUTH_EMAIL,
                pass: process.env.AUTH_PASSWORD,
            },
        });
    
        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: receiverEmail,
            subject: subject,
            html: body
        };
    
        const mail = await transporter.sendMail(mailOptions);

    } catch (error) {
        console.log(error);
        res.json({ error: error });
    }
}

module.exports = { sendEmail }