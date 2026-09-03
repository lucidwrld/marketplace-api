import express from "express"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { initializePayment } from "../controllers/paymentController.js"

const router = express.Router()

router.post("/initialize-payment/:id", authMiddleware, initializePayment) 

export default router