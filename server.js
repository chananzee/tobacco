const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();

// static folder
app.use(express.static('public'));

// upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// API upload
app.post('/upload', upload.single('image'), (req, res) => {

  // 🔥 TODO: เปลี่ยนเป็น AI จริงภายหลัง
  const result = {
    disease: "จุดสนิมสาหร่าย",
    confidence: "97%"
  };

  res.json(result);
});

app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});