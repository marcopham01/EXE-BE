var express = require("express");
var router = express.Router();
const user = require("../controller/UserController");
const auth = require("../middlewares/auth");

/**
 * @openapi
 * tags:
 *   - name: users
 *     description: User APIs
 */

/**
 * @openapi
 * /users/register:
 *   post:
 *     tags: [users]
 *     summary: Đăng ký tài khoản
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               fullName: { type: string }
 *     responses:
 *       201:
 *         description: Tạo user thành công
 */
router.post("/register", user.registerUser);

/**
 * @openapi
 * /users/login:
 *   post:
 *     tags: [users]
 *     summary: Đăng nhập
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 */
router.post("/login", user.login);
router.get(
  "/getprofile",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  user.getProfileUser
);
/**
 * @openapi
 * /users/getprofile:
 *   get:
 *     tags: [users]
 *     summary: Lấy thông tin profile người dùng hiện tại
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin user
 */
router.get("/getallprofile", user.getAllProfileUsers);
/**
 * @openapi
 * /users/getallprofile:
 *   get:
 *     tags: [users]
 *     summary: Lấy danh sách toàn bộ user (demo)
 *     responses:
 *       200:
 *         description: Danh sách user
 */

router.delete(
  "/delete",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  user.deleteMe
);
/**
 * @openapi
 * /users/delete:
 *   delete:
 *     tags: [users]
 *     summary: Xóa tài khoản của chính mình
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đã xóa
 */

module.exports = router;