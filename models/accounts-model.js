// models/Customer.js
const mongoose = require('mongoose');

// models/Account.js
const accountSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  accountType: { type: String, enum: ['savings', 'checking', 'credit'] },
  accountNumber: String,
  routingNumber: String,
  balance: { type: Number, default: 0.00, set: v => Math.round(v * 100) / 100},
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'frozen', 'closed'], default: 'active' }
});
module.exports = mongoose.model('Account', accountSchema);