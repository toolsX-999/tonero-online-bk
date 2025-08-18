// // Checks if user is logged in
require("dotenv").config();

const jwt = require("jsonwebtoken");

function isAuthenticated(req, res, next) {
  const token = req.cookies.token;
  // console.log("Token in isAuthenticated = ", token);
  
  if (!token) return res.redirect("/user/login");

  jwt.verify(token, process.env.JWTSECRET, (err, decoded) => {
    if (err) return res.redirect("/user/login");
    req.user = decoded;
    // console.log("decoded in isAuthenticated: ", decoded);
    // console.log("req.user in isAuthenticated: ", req.user);  
    next();
  });
}

module.exports = isAuthenticated;

