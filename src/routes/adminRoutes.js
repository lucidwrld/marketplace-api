import express from "express"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { getAdminGetVendors, getAdminPayouts, getAdminRevenue, getAdminVendorById, verifyVendor } from "../controllers/adminController.js"
import { validateRequest } from "../middleware/validateRequest.js"
import { verifyVendorSchema } from "../validators/adminSchema.js"

const router = express.Router()

router.use(authMiddleware)

router.get("/get-admin-payouts", getAdminPayouts)
router.get("/get-admin-revenue", getAdminRevenue)
router.put("/update-vendor/:id", validateRequest(verifyVendorSchema), verifyVendor)
router.get("/get-all-vendors", getAdminGetVendors)
router.get("/get-vendor-by-id/:id", getAdminVendorById)


export default router