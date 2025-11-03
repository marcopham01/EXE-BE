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
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Tạo user thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: 'User register successfully' }
 *                 success: { type: boolean, example: true }
 *                 error: { type: boolean, example: false }
 *                 data:
 *                   type: object
 *                   properties:
 *                     username: { type: string }
 *                     phonenumber: { type: string }
 *                     email: { type: string }
 *                     fullname: { type: string }
 *                     gender: { type: string, enum: ['male','female'] }
 *                     job: { type: string, enum: ['Học sinh','Sinh viên','Đã đi làm'] }
 *                     birthDate: { type: string, format: date-time }
 *                     age: { type: integer }
 *       400:
 *         description: Lỗi dữ liệu đầu vào
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               duplicateUsername:
 *                 value: { success: false, error: false, message: 'Please Create New UserName' }
 *               duplicateFullName:
 *                 value: { success: false, error: false, message: 'Please Create New Full Name' }
 *               invalidBirthDate:
 *                 value: { success: false, error: false, message: 'birthDate invalid' }
 *               invalidAge:
 *                 value: { success: false, error: false, message: 'Tuổi phải từ 13 đến 120' }
 *               invalidJob:
 *                 value: { success: false, error: false, message: 'job must be one of: Học sinh, Sinh viên, Đã đi làm' }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       201:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         description: Sai thông tin đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               notFound:
 *                 value: { success: false, error: false, message: 'User not found' }
 *               wrongPassword:
 *                 value: { success: false, error: false, message: 'Password Incorect' }
 *       401:
 *         description: Lỗi xác thực/không mong muốn
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post("/login", user.login);

/**
 * @openapi
 * /users/refresh:
 *   post:
 *     tags: [users]
 *     summary: Cấp mới accessToken bằng refreshToken
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200:
 *         description: Access token mới
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokens'
 *       400:
 *         description: Thiếu refreshToken
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               missing:
 *                 value: { success: false, message: 'Missing refreshToken' }
 *       401:
 *         description: RefreshToken không hợp lệ hoặc không có quyền
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               invalid:
 *                 value: { success: false, message: 'Invalid refreshToken' }
 *               unauthorized:
 *                 value: { success: false, message: 'Unauthorized' }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post("/refresh", user.refresh);
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Không tìm thấy profile
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
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
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/PaginatedUsers' }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Đã xóa tài khoản' }
 *       401:
 *         description: Chưa đăng nhập
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Lỗi máy chủ
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */

module.exports = router;