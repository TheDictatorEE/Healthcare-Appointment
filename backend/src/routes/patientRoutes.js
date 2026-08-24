const express = require("express");
const rateLimit = require("express-rate-limit");
const { asyncHandler } = require("../middleware/errorHandler");
const { authenticate, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/patientController");

const router = express.Router();
router.use(authenticate, authorize("PATIENT"));

// Small feature: rate limit booking endpoint to prevent spam bookings
const bookingLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

router.get("/doctors", asyncHandler(ctrl.searchDoctors));
router.get("/doctors/:doctorId/slots", asyncHandler(ctrl.getAvailableSlots));
router.post("/appointments", bookingLimiter, asyncHandler(ctrl.bookAppointment));
router.get("/appointments", asyncHandler(ctrl.myAppointments));
router.post("/appointments/:appointmentId/cancel", asyncHandler(ctrl.cancelAppointment));

module.exports = router;
