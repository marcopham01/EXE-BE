const express = require("express");
const router = express.Router();

const userRouter = require("../routes/users");
const mealRouter = require("../routes/meal");
const paymentRouter = require("../routes/payment");
const aiRouter = require("../routes/ai");

router.use("/users", userRouter);
router.use("/meal", mealRouter);
router.use("/payment", paymentRouter);
router.use("/ai", aiRouter);

module.exports = router;