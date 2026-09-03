import express from "express"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { getBuyerTransactions, getVendorTransactions } from "../controllers/transactionController.js"

const router = express.Router()

router.use(authMiddleware)

router.get("/buyer", getBuyerTransactions)
router.get("/vendor", getVendorTransactions)

export default router