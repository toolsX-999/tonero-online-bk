// ===============================
// 📁 routes/api/transfer.js
// ===============================
const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction-model');
const Customer = require('../models/customer-model');
const Account = require("../models/accounts-model");
const isAuthenticated = require("../middlewares/isAuthenticated");

const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "server165.web-hosting.com",
  auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
  },
});

// Initiate new transaction and store in DB
router.post('/initiate', isAuthenticated, async (req, res) => {
  const {
    fromAccountNumberHiddenField,
    recipient,
    recipientBank,
    remarks,
    amount,
    transactionType,
    transferType,
  } = req.body;

  const userId = req.user.userId;
  // console.log(`fromAccount = ${fromAccountNumberHiddenField} and toAccount = ${recipient} in /initiate route`);
  
  try {
    const transaction = await Transaction.create({
      userId,
      fromAccount: fromAccountNumberHiddenField,
      toAccount: recipient,
      toBank: recipientBank,
      transferType,
      amount,
      transactionType,
      remarks,
    });
  
    // console.log("Request entered /transfer route");
    // console.log("Transaction saved in Transaction Table: ", transaction);
    // await transaction.save();
    return res.status(201).json({ transactionId: transaction._id });
  } catch (error) {
    // console.log("Error occured in /transfer route: ", error.message);
  }
});

// Validate checkpoint
router.get('/checkpoint', isAuthenticated, async (req, res) => {
  const { transactionId, percent, type } = req.query;
  const customerId = req.user.userId;
  
  if (!customerId || !transactionId || !percent || !type) {
    // console.log("Missing parameters in checkpoint");
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    // console.log("User found in /checkpoint route");
    
    const settings = customer.otpSettings?.[type];
    // console.log("Settings in /checkpoint route = ", settings);
    
    if (!settings || !settings.enabled || !Array.isArray(settings.checkpoints)) {
      // console.log("OTP is not required in /checkout route");
      return res.json({ requiresOtp: false });
    }
    // console.log("OTP 1 is required in /checkpoint route");
  
    const percentNum = parseInt(percent);
    const isCheckpoint = settings.checkpoints.includes(percentNum);
    if (!isCheckpoint) return res.json({ requiresOtp: false });
    // console.log("OTP 2 is required in /checkpoint route");
  
    const txn = await Transaction.findById(transactionId);
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    // console.log("Transaction found");
  
    if (!txn.usedCheckpoints.includes(percentNum)) {
      // console.log("OTP is truely required in /checkpoint route");
      // Send email Alert to the users/account owner account for OTP required
      transporter.sendMail({
        from: process.env.EMAIL,
        to: customer.email,
        subject: "⚠️ Transaction Verification Required – EliteTrust-Bank",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #004085; margin-bottom: 0;">EliteTrust-Bank<sup>®</sup></h2><br>
            <p style="color: red; font-weight: bold; margin-top: 4px;">Notice</p>
    
            <p style="font-size: 16px; color: #333333; line-height: 1.6;">
              A transaction was recently initiated from your EliteTrust-Bank account. For your security, verification is required to proceed with this transaction. Please contact support team at <a href="mailto:${process.env.EMAIL}">${process.env.EMAIL}</a> for verification code.
    
            <div style="padding: 16px; background-color: #fff3cd; border-left: 5px solid #ffc107; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-size: 15px; color: #856404;">
                <strong>Action Required:</strong> Without verification, this transaction will remain pending. If you did not initiate this transaction, please contact our fraud department immediately.
              </p>
            </div>
    
            <p style="font-size: 15px; color: #333;">
              Need help? Reach our support at <a href="mailto:${process.env.EMAIL}">${process.env.EMAIL}</a> or call our 24/7 hotline.
            </p>    
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
            <small style="font-size: 12px; color: #888888; line-height: 1.6; display: block;">
              This message and any attachments are intended only for the individual or entity to which they are addressed and may contain confidential and/or privileged information belonging to EliteTrust-Bank. If you are not the intended recipient, you are hereby notified that any review, dissemination, distribution, or copying of this communication is strictly prohibited. If you have received this email in error, please notify us immediately by replying to this email or by contacting customer care at <a href="mailto:${process.env.EMAIL}">${process.env.EMAIL}</a> and delete this message from your system.<br><br>
              All rights reserved. EliteTrust-Bank<sup>®</sup> is a registered trademark. Unauthorized use is prohibited. This email was generated automatically—please do not reply directly to this message.
            </small>
          </div>
        `
      });
    return res.json({ requiresOtp: true, otpMsgs: settings.otpMsgs, checkpoint: percentNum });
  } 
  } catch (error) {
    console.error("Email send failed:", error);
  }
  // console.log("OTP is not required in /checkpoint route");
  res.json({ requiresOtp: false });
});

// Verify OTP and allow transaction
router.post('/otp/verify', async (req, res) => {
  const { transactionId, code, percent } = req.body;
  // console.log("In /otp/verify route");
  // console.log("transactionId, code, percent in /otp/verify = ", transactionId, code, percent);

  const tx = await Transaction.findById(transactionId);
  if (!tx) return res.status(404).json({ error: 'Transaction not found' });
  
  const customer = await Customer.findById(tx.userId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const otpConfig = customer.otpSettings?.[tx.transactionType];
  if (!otpConfig || !otpConfig.enabled) {
    return res.status(400).json({ error: 'OTP not enabled for this transaction type' });
  }

  const index = otpConfig.checkpoints.indexOf(parseInt(percent));
  if (index === -1) {
    return res.status(400).json({ error: 'Checkpoint not found' });
  }

  if (tx.usedCheckpoints.includes(parseInt(percent))) {
    return res.status(400).json({ error: 'OTP already used' });
  }

  const correctCode = otpConfig.codes[index];
  if (correctCode !== code) {
    return res.status(401).json({ error: 'Invalid OTP' });
  }
  // Mark checkpoint as used
  tx.usedCheckpoints.push(parseInt(percent));
  await tx.save();
  
  return res.json({ success: true });
});


router.post("/complete", async (req, res) => {
  // console.log("in /complete route BE");
  const {transactionId, allOtpsVerification, recipientBank} = req.body;
  if (!transactionId || !allOtpsVerification || !recipientBank) {
    // console.log('Transaction not completed' );
    return res.status(401).json({ error: 'Transaction not completed' });
  }
  // console.log(`transactionId = ${transactionId}, allOtpsVerification = ${allOtpsVerification}, recipientBank = ${recipientBank} in /complete route`);
  try {
    const transaction = await Transaction.findById(transactionId);
    transaction.status = allOtpsVerification;
    await transaction.save();
    console.log("Transaction updated in BE /complete route");
    
    // Update sender account balance
    const senderAccount = await Account.findOne({customerId: transaction.userId});
    senderAccount.balance = parseFloat(senderAccount.balance - transaction.amount).toFixed(2);
    await senderAccount.save();
    const sender = await Customer.findById(transaction.userId);

    // console.log("Sender Account updated in BE /complete route");

    if (recipientBank == "ELT-Bank") {
      const recipientAccount = await Account.findOne({accountNumber: transaction.toAccount});
      recipientAccount.balance = parseFloat(recipientAccount.balance + transaction.amount).toFixed(2);
      await recipientAccount.save(); 
      // Send email Alert to recipients email address
      // console.log("Recipient Account updated in BE /complete route");
      const recipientId = recipientAccount.customerId;
      const recipient = await Customer.findById(recipientId);
      const recipientEmail = recipient.email;
      try {
        transporter.sendMail({
          from: process.env.EMAIL,
          to: recipientEmail,
          subject: "💰 Transfer Received – EliteTrust-Bank",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
              <h2 style="color: #004085;">EliteTrust-Bank<sup>®</sup></h2><br>
              <h3 style="color: #007bff;">You've Received a Transfer</h3>
        
              <p style="font-size: 16px; color: #333;">
                A transfer has been made to your account.
              </p>
        
              <div style="padding: 16px; background-color: #cce5ff; border-left: 5px solid #007bff; border-radius: 4px; margin: 20px 0;">
                <p style="margin: 0; font-size: 15px; color: #004085;">
                  <h4>Transaction details:</h4>
                  <hr>
                  <strong>From:</strong> ${sender.fullName}<br>
                  <strong>To:</strong> ${recipient.fullName}<br>
                  <strong>Acc No:</strong> ${transaction.toAccount}<br>
                  <strong>Amount:</strong> $${transaction.amount.toFixed(2)}<br>
                  <strong>Date:</strong> ${new Date(transaction.createdAt).toLocaleString()}<br>
                </p>
              </div>
        
              <p style="font-size: 15px;">
                Log in to your account to view full transaction details.
              </p>
        
              <p style="font-size: 15px; color: #333;">
                Need help? Contact us at <a href="mailto:${process.env.EMAIL}">${process.env.EMAIL}</a>.
              </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
            <small style="font-size: 12px; color: #888888; line-height: 1.6; display: block;">
              This message and any attachments are intended only for the individual or entity to which they are addressed and may contain confidential and/or privileged information belonging to EliteTrust-Bank. If you are not the intended recipient, you are hereby notified that any review, dissemination, distribution, or copying of this communication is strictly prohibited. If you have received this email in error, please notify us immediately by replying to this email or by contacting customer care at <a href="mailto:${process.env.EMAIL}">${process.env.EMAIL}</a> and delete this message from your system.<br><br>
              All rights reserved. EliteTrust-Bank<sup>®</sup> is a registered trademark. Unauthorized use is prohibited. This email was generated automatically—please do not reply directly to this message.
            </small>
            </div>
          `
        });      
        return res.status(200).json({ error: 'Transaction completed' });

      } catch (error) {
        console.log("Error email sending failed: ", error.message);
      }
    }
    // Send Alert to senders email
    // console.log("Transaction updated successfully in /complete route");
    try {
      transporter.sendMail({
        from: process.env.EMAIL,
        to: sender.email, // set this dynamically
        subject: "✅ Transaction Confirmation – EliteTrust-Bank",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
            <h2 style="color: #155724;">EliteTrust-Bank<sup>®</sup></h2>
            <h3 style="color: #28a745; margin-top: 12px;">Your Transaction was Successful</h3>
      
            <p style="font-size: 16px; color: #333333; line-height: 1.6;">
              Your recent transfer has been completed successfully.
            </p>
            <h4>Transaction details:</h4>
            <hr>
            <div style="padding: 16px; background-color: #d4edda; border-left: 5px solid #28a745; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-size: 15px; color: #155724;">
                <strong>To:</strong> ${recipient.fullName} (Acc No: ${transaction.toAccount})<br>
                <strong>Status:</strong> ${allOtpsVerification}<br>
                <strong>Transaction ID:</strong> ${transaction._id}<br>
                <strong>Amount:</strong> $${transaction.amount.toFixed(2)}<br>
                <strong>Date:</strong> ${new Date(transaction.createdAt).toLocaleString()}
              </p>
            </div>
      
            <p style="font-size: 15px;">
              👉 <a href="#" style="color: #007bff;">Click here to download your PDF receipt</a>
            </p>
      
            <p style="font-size: 15px; color: #333;">
              For help, contact <a href="mailto:${process.env.EMAIL}">${process.env.EMAIL}</a>.
            </p>
      
            <hr style="margin: 30px 0; border-top: 1px solid #ddd;" />
            <small style="font-size: 12px; color: #888;">
              <strong style="color: red;">Notice:</strong> This message is property of ELT-Bank. If received in error, contact
              <a href="mailto:${process.env.EMAIL}">${process.env.EMAIL}</a>.
              This is an automated message, do not reply.
            </small>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
            <small style="font-size: 12px; color: #888888; line-height: 1.6; display: block;">
              This message and any attachments are intended only for the individual or entity to which they are addressed and may contain confidential and/or privileged information belonging to EliteTrust-Bank. If you are not the intended recipient, you are hereby notified that any review, dissemination, distribution, or copying of this communication is strictly prohibited. If you have received this email in error, please notify us immediately by replying to this email or by contacting customer care at <a href="mailto:${process.env.EMAIL}">${process.env.EMAIL}</a> and delete this message from your system.<br><br>
              All rights reserved. EliteTrust-Bank<sup>®</sup> is a registered trademark. Unauthorized use is prohibited. This email was generated automatically—please do not reply directly to this message.
            </small>
          </div>
        `
      });
      return res.status(200).json({ error: 'Transaction completed' });

    } catch (error) {
      console.log("Error email sending failed: ", error.message);
    }
    return res.status(200).json({ message: 'Transaction completed' });
  } catch (error) {
    // console.log("Transaction update failed");
    return res.status(500).json({ message: 'Transaction update failed' });
  }
});

// Original checkpoint copy before modification
// router.get('/checkpoint', isAuthenticated, async (req, res) => {
//   const { transactionId, percent, type } = req.query;
//   const customerId = req.user.userId;
  
//   if (!customerId || !transactionId || !percent || !type) {
//     return res.status(400).json({ error: 'Missing parameters' });
//   }

//   const customer = await Customer.findById(customerId);
//   if (!customer) return res.status(404).json({ error: 'Customer not found' });
  
//   const settings = customer.otpSettings?.[type];
  
//   if (!settings || !settings.enabled || !Array.isArray(settings.checkpoints)) {
//     return res.json({ requiresOtp: false });
//   }

//   const percentNum = parseInt(percent);
//   const isCheckpoint = settings.checkpoints.includes(percentNum);
//   if (!isCheckpoint) return res.json({ requiresOtp: false });

//   const txn = await Transaction.findById(transactionId);
//   if (!txn) return res.status(404).json({ error: 'Transaction not found' });

//   if (!txn.usedCheckpoints.includes(percentNum)) {
//     try {
//       transporter.sendMail({
//         from: process.env.EMAIL,
//         to: customer.email,
//         subject: "⚠️ Transaction Verification Required – EliteTrust-Bank",
//         html: `
//           <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
//             <h2 style="color: #004085; margin-bottom: 0;">EliteTrust-Bank<sup>®</sup></h2><br>
//             <p style="color: red; font-weight: bold; margin-top: 4px;">Notice</p>
    
//             <p style="font-size: 16px; color: #333333; line-height: 1.6;">
//               A transaction was recently initiated from your EliteTrust-Bank account. For your security, verification is required to proceed with this transaction. Please contact support team at <a href="mailto:${process.env.EMAIL}">${process.env.EMAIL}</a> for verification code.
    
//             <div style="padding: 16px; background-color: #fff3cd; border-left: 5px solid #ffc107; border-radius: 4px; margin: 20px 0;">
//               <p style="margin: 0; font-size: 15px; color: #856404;">
//                 <strong>Action Required:</strong> Without verification, this transaction will remain pending. If you did not initiate this transaction, please contact our fraud department immediately.
//               </p>
//             </div>
    
//             <p style="font-size: 15px; color: #333;">
//               Need help? Reach our support at <a href="mailto:${process.env.EMAIL}">${process.env.EMAIL}</a> or call our 24/7 hotline.
//             </p>    
//             <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
//             <small style="font-size: 12px; color: #888888; line-height: 1.6; display: block;">
//               This message and any attachments are intended only for the individual or entity to which they are addressed and may contain confidential and/or privileged information belonging to EliteTrust-Bank. If you are not the intended recipient, you are hereby notified that any review, dissemination, distribution, or copying of this communication is strictly prohibited. If you have received this email in error, please notify us immediately by replying to this email or by contacting customer care at <a href="mailto:${process.env.EMAIL}">${process.env.EMAIL}</a> and delete this message from your system.<br><br>
//               All rights reserved. EliteTrust-Bank<sup>®</sup> is a registered trademark. Unauthorized use is prohibited. This email was generated automatically—please do not reply directly to this message.
//             </small>
//           </div>
//         `
//       });
//     } catch (error) {
//       console.error("Email send failed:", error);
//     }
//     return res.json({ requiresOtp: true, otpMsgs: settings.otpMsgs, checkpoint: percentNum });
//   }
//   res.json({ requiresOtp: false });
// });

module.exports = router;
