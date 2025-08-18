// // Checks if user is logged in
require("dotenv").config();
const Admin = require("../models/admin-model");
const jwt = require("jsonwebtoken");

function isAuthenticatedAdmin(req, res, next) {
  const token = req.cookies.token;
  // console.log("Token in isAuthenticated = ", token);
  
  if (!token) return res.redirect("/admin/login");

  jwt.verify(token, process.env.JWTSECRET, async (err, decoded) => {
    if (err) return res.redirect("/admin/login");
    const user = await Admin.findById({_id: decoded.userId});
    if (user && user.status == "Active") {
      req.user = {userId: decoded.userId};
      console.log("decoded in isAuthenticatedAdmin: ", decoded);
      console.log("req.user in isAuthenticatedAdmin: ", req.user);  
      console.log("req.user.userId in isAuthenticatedAdmin: ", req.user.userId);  
      return next();
    }
    console.log(("Not admin authenticated"));
  });
}

module.exports = isAuthenticatedAdmin;

