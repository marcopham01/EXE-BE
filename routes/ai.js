const express = require("express");
const router = express.Router();
const AI = require("../controller/AIController");
const auth = require("../middlewares/auth");

// Cho phép cả khách dùng thử; nếu muốn bắt buộc đăng nhập thì thêm auth ở đây
router.post(
  "/ingredients-from-image",
  AI.uploadMiddleware,
  AI.ingredientsFromImage
);

module.exports = router;


