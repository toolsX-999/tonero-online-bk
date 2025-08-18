const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
    res.render("pages/index")
});

router.get("/index", async (req, res) => {
    res.render("pages/index")
});

router.get("/about", async (req, res) => {
    res.render("pages/about")
});

router.get("/services", async (req, res) => {
    res.render("pages/services")
});

router.get("/contact", async (req, res) => {
    res.render("pages/contact")
});

router.get("/one-page", async (req, res) => {
    res.render("pages/one-page")
});

module.exports = router;