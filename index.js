const express = require('express');
const connectDB = require('./config/db');
const app = express();
const authRoute = require('./routes/auth');
const collectionRoute = require('./routes/collections');
const tasksRoute = require('./routes/tasks');
const refreshToken = require('./routes/refreshToken');
const cors = require('cors');
const cookieParser = require('cookie-parser');


connectDB();

const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());

app.use(cors({ origin: true, credentials: true}));


app.use('/api/auth', authRoute);
app.use('/api/collections', collectionRoute);
app.use('/api/tasks', tasksRoute);
app.use('/refreshToken', refreshToken);


app.listen(port, ()=>{
    console.log("Server listening at port " + port);
});