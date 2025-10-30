require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const dbConnect = require("./DB/db");
const routes = require("./router");
const { connectRedis } = require("./services/redis");
var app = express();
// Initialize Redis (non-blocking)
connectRedis().catch((err) => console.error("Redis init failed:", err));
var cors = require("cors");
const bodyParser = require("body-parser");
//API only
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Đăng ký các schema tham chiếu để mongoose biết khi populate
require("./model/meal/ingredient");
require("./model/meal/category");
require("./model/meal/subCategory");

app.use(
  cors({
    origin: "*", // Cho phép tất cả origins
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// connect DB
dbConnect();
app.use("/api", routes);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: req.app.get("env") === "development" ? err : {},
    success: false,
  });
});

module.exports = app;
