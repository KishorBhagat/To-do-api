const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = async ()=>{
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Database connected successfully");
    } catch (error) {
        console.log("FAILED to connect database");
    }
}

module.exports = connectDB;
