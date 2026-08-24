const express = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const { authenticate, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/doctorController");

const router = express.Router();
router.use(authenticate, authorize("DOCTOR"));

router.get("/appointments", asyncHandler(ctrl.myAppointments));
router.post("/appointments/:appointmentId/complete", asyncHandler(ctrl.submitPostVisit));
router.post("/appointments/:appointmentId/no-show", asyncHandler(ctrl.markNoShow));

module.exports = router;
