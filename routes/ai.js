const express = require("express");
const router = express.Router();
const AI = require("../controller/AIController");
const auth = require("../middlewares/auth");

/**
 * @openapi
 * tags:
 *   - name: ai
 *     description: AI-related endpoints
 */

/**
 * @openapi
 * /ai/ingredients-from-image:
 *   post:
 *     tags: [ai]
 *     summary: Nhận diện nguyên liệu từ ảnh (Gemini)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image: { type: string, format: binary }
 *               imageUrl: { type: string }
 *               userId: { type: string }
 *               heightCm: { type: number }
 *               weightKg: { type: number }
 *               bmi: { type: number }
 *     responses:
 *       200:
 *         description: Danh sách nguyên liệu và gợi ý món ăn
 */
// Bắt buộc đăng nhập: tự lấy userId từ token
router.post(
  "/ingredients-from-image",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  AI.uploadMiddleware,
  AI.ingredientsFromImage
);

module.exports = router;


