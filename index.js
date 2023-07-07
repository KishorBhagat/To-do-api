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

app.use(cors({ 
    origin: ['http://localhost:3000', 'http://127.0.0.1:5173'], 
    credentials: true,
}));


app.use('/api/auth', authRoute);
app.use('/api/collections', collectionRoute);
app.use('/api/tasks', tasksRoute);
app.use('/api/refreshToken', refreshToken);


app.listen(port, ()=>{
    console.log("Server listening at port " + port);
});