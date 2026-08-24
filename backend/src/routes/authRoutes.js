const express = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const { authenticate } = require("../middleware/auth");
const ctrl = require("../controllers/authController");

const router = express.Router();

router.post("/register", asyncHandler(ctrl.register));
router.post("/login", asyncHandler(ctrl.login));
router.get("/me", authenticate, asyncHandler(ctrl.me));

// Google Calendar OAuth linking (per logged-in user)
router.get("/google/connect", authenticate, ctrl.googleConnect);
router.get("/google/callback", asyncHandler(ctrl.googleCallback)); // Google redirects here, no auth header

module.exports = router;
