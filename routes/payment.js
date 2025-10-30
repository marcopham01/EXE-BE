var express = require("express");
var router = express.Router();
const auth = require("../middlewares/auth");
const payment = require("../controller/PaymentController");


// Premium membership payment:
router.post("/create",
    auth.authMiddleWare,
    auth.requireRole("customer"),
    payment.createPaymentLink
); // Tạo đơn thanh toán, trả về link/transactionId
router.post(
  "/update-status",
  auth.authMiddleWare,
  auth.requireRole("customer", "admin"),
  payment.updatePaymentStatus
);
router.get("/success", payment.paymentSuccess);
router.get("/cancel", payment.paymentCancel);
router.get("/history", payment.getMyTransactions); // Lấy lịch sử giao dịch premium cho user

module.exports = router;