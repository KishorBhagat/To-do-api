const express = require('express');
const connectDB = require('./config/db');
const app = express();
const authRoute = require('./routes/auth');
const usersRoute = require('./routes/users');
const collectionRoute = require('./routes/collections');
const tasksRoute = require('./routes/tasks');
const refreshToken = require('./routes/refreshToken');
const cors = require('cors');
const cookieParser = require('cookie-parser');


connectDB();

const port = process.env.PORT || 5000;


app.use(express.json());
app.use(cookieParser());

const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');

app.use(cors({ 
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));


app.use('/api/auth', authRoute);
app.use('/api/user', usersRoute);
app.use('/api/collections', collectionRoute);
app.use('/api/tasks', tasksRoute);
app.use('/api/refreshToken', refreshToken);


app.listen(port, ()=>{
    console.log("Server listening at port " + port);
});