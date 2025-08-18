const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    fullName: { type: String },
    email: { type: String },
    role: { type: String, default: 'Admin' },
    passwordHash: String,
    createdAt: { type: Date, default: Date.now },
    lastLogin: Date,
    status: { type: String, enum: ['Active', 'Flagged', 'Closed'], default: 'Active' },
});

module.exports = mongoose.model('Admin', adminSchema);
