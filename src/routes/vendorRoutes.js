import express from "express"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { validateRequest } from "../middleware/validateRequest.js"
import { createVendorProfile, deleteVendorProfile, getAllVendors, getPayouts, getVendorProfile,  updateVendorProfile } from "../controllers/vendorController.js"
import { createVendorProfileSchema, updateVendorProfileSchema } from "../validators/vendorSchema.js"

const router = express.Router()

router.use(authMiddleware)

router.post("/create", validateRequest(createVendorProfileSchema), createVendorProfile)
router.get("/", getVendorProfile)
router.put("/update/:id", validateRequest(updateVendorProfileSchema), updateVendorProfile)
router.delete("/delete/:id",  deleteVendorProfile)
router.get("/all", getAllVendors)
router.get("/payouts", getPayouts)



export default router