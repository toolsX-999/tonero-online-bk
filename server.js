require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectMongo = require("./utils/connect-mongoDB");
const methodOveride = require("method-override");
const path = require("path");
const adminRouter = require("./routes/admin-router");
const sitenavRouter = require("./routes/sitenav-router");
const transferRouter = require('./routes/transfer-router');
const userRouter = require("./routes/user-router");

const app = express();

const port = parseInt(process.env.PORT, 10) || 3002;

connectMongo();

app.use(cors({
    credentials: true
}));

app.use(methodOveride("_method"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.locals.config = {
        siteUrl: process.env.SITEURL,
        phoneNumber: process.env.PHONENUMBER,
        contactEmail: process.env.CONTACTEMAIL,
        customerCareEmail: process.env.CUSTOMERCAREEMAIL,
        customerServicePhoneNumber: process.env.CUSTOMERSERVICEPHONENUMBER
    }
    next();
});

app.use("/", sitenavRouter);
app.use("/user", userRouter);
app.use('/transfer', transferRouter);
app.use("/admin", adminRouter);

// Update here to avoid errors in line 73 node_modules/path-regex..../index.js
app.use((req, res) => {
    res.status(404).render('404', { url: req.originalUrl });
});

app.listen(port, (req, res) => {
    console.log("Bank server is on and running on port: ", port);
})