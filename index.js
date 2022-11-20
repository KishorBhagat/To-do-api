const express = require('express');
const connectDB = require('./db');
const app = express();
const authRoute = require('./routes/auth');
const tasksRoute = require('./routes/tasks');
connectDB();

const port = process.env.PORT || 5000;

app.use(express.json());

// app.get('/', (req, res)=>{
//     res.status(200).json("Hello World");
// });
app.use('/api/auth', authRoute);
app.use('/api/task', tasksRoute);


app.listen(port, ()=>{
    console.log("Server listening at port " + port);
});