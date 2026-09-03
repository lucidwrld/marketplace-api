import express from "express"
import { validateRequest } from "../middleware/validateRequest.js"
import { loginUser, logout, registerUser } from "../controllers/authController.js"
import { loginUserSchema, registerUserSchema } from "../validators/authSchema.js"


const router  = express.Router()

router.post("/register", validateRequest(registerUserSchema), registerUser)
router.post("/login", validateRequest(loginUserSchema), loginUser)
router.post("/logout",  logout)

export default router