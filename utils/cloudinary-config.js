// cloudinary-config.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARYCLOUDNAME,
  api_key: process.env.CLOUDINARYAPIKEY,
  api_secret: process.env.CLOUDINARYAPISECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'user_uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
    public_id: (req, file) => `profile_${Date.now()}`
  }
});

const upload = multer({ storage });

module.exports = { upload, cloudinary };
