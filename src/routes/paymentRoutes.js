import express from "express"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { initializePayment } from "../controllers/paymentController.js"

const router = express.Router(authMiddleware)

router.post("/initialize-payment/:id", initializePayment) 

export default router