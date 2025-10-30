const express = require("express");
const router = express.Router();

const userRouter = require("../routes/users");
const mealRouter = require("../routes/meal");
const paymentRouter = require("../routes/payment");

router.use("/users", userRouter);
router.use("/meal", mealRouter);
router.use("/payment", paymentRouter);

module.exports = router;