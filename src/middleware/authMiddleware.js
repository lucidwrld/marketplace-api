import jwt from "jsonwebtoken"
import { prisma } from "../config/db.js";


export const authMiddleware = async (req, res, next) => {

    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1]

    } else if (req.cookies?.jwt) {
        token = req.cookies?.jwt
    }

    if (!token) {
        return res.status(401).json({
            error: "Unauthorized access"
        })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const verifyUserExists = await prisma.user.findUnique({
            where: { id: decoded.id }
        })

        if (!verifyUserExists) {
            return res.status(404).json({
                error: "User does not exist on this platform"
            })
        }
        req.user = verifyUserExists
        next()

    } catch (error) {
        res.status(401).json({
            error: "Unauthorized access"
        })
    }



}