const express = require("express");
const router = express.Router();
const AI = require("../controller/AIController");
const auth = require("../middlewares/auth");

// Bắt buộc đăng nhập: tự lấy userId từ token
router.post(
  "/ingredients-from-image",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  AI.uploadMiddleware,
  AI.ingredientsFromImage
);

module.exports = router;


