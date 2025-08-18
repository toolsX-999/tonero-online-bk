require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const customer = require("../models/customer-model");
const Account = require("../models/accounts-model");
const Transaction = require("../models/transaction-model");
const isAuthenticated = require("../middlewares/isAuthenticated");
const util = require("util");

// bcrypt.compare = util.promisify(bcrypt.compare);
jwt.sign = util.promisify(jwt.sign);

const router = express.Router();

// Server health check route
router.get("/keepup", (req, res) => {
    return res.status(200).json("Server is up")
})

// Get login page
router.get("/login", async (req, res) => {
    // This makes sure the form loggin in
    // does not show when back in the browser is clicked
    res.set("Cache-Control", "no-store"); 
    res.render("pages/user/login")
});

// Login user
router.post("/login", async(req, res) => {
    const {email, password} = req.body;
    if (!email || !password) {
        console.log("Missing credentials");
        return res.status(400).json({message: "Missing credentials"});
    }
    try {
        const user = await customer.findOne({email});
        if (!user) {
            console.log("User does not exist");
            return res.status(404).json({message: "User does not exist"});
        }
        const passwordMatch = bcrypt.compareSync(password, user.passwordHash);
        if (!passwordMatch) {
            console.log("User does not exist");
            return res.status(404).json({message: "Invalid credentials"});
        }
        user.lastLogin = Date.now();
        await user.save();
        jwt.sign({ userId: user._id }, process.env.JWTSECRET, { expiresIn: "1d" }, function(err, token) {
            console.log("Token in backend = ", token);
            res.cookie("token", token, {
                maxAge: 24 * 60 * 60 * 1000,
            });
            // ✅ Send redirect path in response
            return res.status(200).json({ redirectTo: `/user/account?id=${user._id}` });
          });
        // Set cookie
        
    } catch (error) {
        console.log("Error occured logging in: ", error.message);
        return res.status(500).json({messsage: "Error occured logging in"});
    }
});

// User dashboard view
router.get("/account", isAuthenticated, async (req, res) => {
    try {
        const user = await customer.findById(req.user.userId).select("-passwordHash").populate("accounts");
        if (!user)
            console.log("No user found in /user/account route");
        else
            console.log("User found in /user/account route", user);
            // const account = user.accounts.find((accountInfo) => accountInfo.accountType);
            const account = await Account.find({customerId: user._id});
            console.log("Account type(s) = ", account);
            const transactions = await Transaction.find({userId: user._id}); 
        
        return res.render("pages/user/account-view", {
            userEmail: user.email,
            userFullname: user.fullName,
            account,
            user,
            transactions,
        });
    } catch (error) {
        console.log("Error occured in /user/account: ", error.mesage);
    }
  });

// Update a user profile including password
router.put("/account/profile-update", isAuthenticated, async (req, res) => {
    console.log("In /account/profile-update route");
    
    const { editFullName, editPhoneNumber, editAddress, editPassword } = req.body;
    if (!editFullName || !editPhoneNumber || !editAddress)
        return res.status(200).json({status: "Warning", message: "Some fields are empty"});
    try {
        let hashedPassword;
        if (editPassword) {
            hashedPassword = bcrypt.hashSync(editPassword, 10);
            console.log("HashedPassword: ", hashedPassword);
        }
    
        const user = await customer.findByIdAndUpdate(req.user.userId, {
            fullName: editFullName && editFullName,
            address: editAddress,
            phoneNumber: editPhoneNumber && editPhoneNumber,
            passwordHash: hashedPassword && hashedPassword
        });
        return res.status(201).json({status: "Success", message: "Updated successfully"});
    } catch (error) {
        console.log("Error occured updating user: ", error.messsage);
        return res.status(500).json({status: "Error", message: "Error updating user"});
    }
});

// Delete a transaction from transaction history table
router.delete("/account/history/delete/:itemId", isAuthenticated, async (req, res) => {
    const transactionId = req.params.itemId;
    console.log("Request received in /account/history/delete:itemId route");

    try {
        await Transaction.findByIdAndDelete(transactionId);
        console.log("Deleted successfully");
        return res.status(200).json({status: "Success", message: "Deleted successfully"});
    } catch (error) {
        console.log("Error occured deleting item");
        return res.status(500).json({status: "Error", message: "Error occured deleting item"});
    }
});

// Logout user route
router.get("/logout", (req, res) => {
    console.log("Inside /logout route");
    res.clearCookie('token', { path: '/' });
    // Redirect to the login page
    setTimeout(() => {
        return res.redirect('/user/login');
    }, 2000)
});


module.exports = router;