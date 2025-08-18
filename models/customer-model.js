// models/Customer.js
const mongoose = require('mongoose');

const otpCheckpointSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  checkpoints: [Number], // e.g., [40, 70]
  codes: [String],       // OTP codes in the same order
  otpMsgs: [String],
});

const customerSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  passwordHash: String,
  phoneNumber: { type: String },
  passportNumber: { type: String, default: 'None' },
  address: { type: String, default: "No address added" },
  imageUrl: { type: String },
  imageId: { type: String }, // Use this imageId for deletion
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date,
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  status: { type: String, enum: ['Active', 'Flagged', 'Closed'], default: 'Active' },
  accounts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Account' }],
  // sessionToken: String,
  // sessionExpires: Date,

  otpSettings: {
    transfer: otpCheckpointSchema,
    withdrawal: otpCheckpointSchema,
    deposit: otpCheckpointSchema
  }
});

module.exports = mongoose.model('Customer', customerSchema);
