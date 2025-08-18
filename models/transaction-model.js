// ===============================
// 📁 models/Transaction.js (Mongoose)
// ===============================
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  fromAccount: String,
  toAccount: String,
  toBank: String,
  remarks: String,
  amount: Number,
  currentOtpIndex: { type: Number, default: 0 },
  transactionType: { type: String, enum: ['transfer', 'withdrawal', 'deposit'], required: true },
  transferType: String,
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  usedCheckpoints: [Number], // stores used checkpoints that have been passed
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
