import express from "express"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { validateRequest } from "../middleware/validateRequest.js"
import { createReviewSchema, updateReviewSchema } from "../validators/reviewSchema.js"
import { createReview, deleteReview, getProductReviews, updateReview } from "../controllers/reviewController.js"

const router = express.Router()

router.use(authMiddleware)

router.post("/create/:id", validateRequest(createReviewSchema), createReview)
router.put("/update/:id", validateRequest(updateReviewSchema), updateReview)
router.delete("/delete/:id", deleteReview)
router.get("/get-all/:id", getProductReviews)

export default router