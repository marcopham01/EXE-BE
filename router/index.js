const express = require("express");
const router = express.Router();

const userRouter = require("../routes/users");
const mealRouter = require("../routes/meal");
const paymentRouter = require("../routes/payment");
const aiRouter = require("../routes/ai");
const notiRouter = require("../routes/noti");

router.use("/users", userRouter);
router.use("/meal", mealRouter);
router.use("/payment", paymentRouter);
router.use("/ai", aiRouter);
router.use("/noti", notiRouter);

module.exports = router;