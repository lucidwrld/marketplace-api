import express from "express"
import { getBankDetails,  } from "../controllers/vendorController.js"
import { validateRequest } from "../middleware/validateRequest.js"
import { resolveAccountNumberSchema } from "../validators/utilSchema.js"
const router = express.Router()

router.get("/resolve-bank-account", validateRequest(resolveAccountNumberSchema),getBankDetails)

export default router