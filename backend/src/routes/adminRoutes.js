const express = require("express");
const { asyncHandler } = require("../middleware/errorHandler");
const { authenticate, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/adminController");

const router = express.Router();
router.use(authenticate, authorize("ADMIN"));

router.post("/doctors", asyncHandler(ctrl.createDoctor));
router.get("/doctors", asyncHandler(ctrl.listDoctors));
router.patch("/doctors/:doctorId", asyncHandler(ctrl.updateDoctor));
router.post("/doctors/:doctorId/leave", asyncHandler(ctrl.addLeave));

module.exports = router;
