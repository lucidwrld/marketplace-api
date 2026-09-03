import { prisma } from "../config/db.js"
import bcrypt from "bcryptjs"
import { generateToken } from "../utils/generateToken.js"

const registerUser = async (req, res) => {
    try {
        const { first_name, last_name, email, password, phone, role } = req.body

        const checkIfEmailExists = await prisma.user.findUnique({
            where: { email: email }
        })

        if (checkIfEmailExists) {
            return res.status(400).json({ error: "Email already exists" })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const createdUser = await prisma.user.create({
            data: { first_name, last_name, email, password: hashedPassword, phone, role }
        })

        const token = generateToken(createdUser.id, res)

        if (!token) {
          return  res.status(400).json({ error: "Issue registering user, try again later" })
        }

        res.status(201).json({
            status: "success",
            data: {
                id: createdUser.id,
                first_name,
                last_name,
                email,
                phone,
                role,
                createdAt: createdUser.createdAt

            },
            token
        })


    } catch (error) {
        res.status(400).json({
            error: error.message
        })
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body

        const userExits = await prisma.user.findUnique({
            where: { email: email }
        })

        if (!userExits) {
            return res.status(400).json({
                error: "Incorrect login credentials"
            })
        }

        const confirmPassword = await bcrypt.compare(password, userExits.password)

        if (!confirmPassword) {
            return res.status(400).json({
                error: "Incorrect login credentials"
            })
        }

        const token = generateToken(userExits?.id, res)

        if (!token) {
          return  res.status(400).json({ error: "Issue logging user in, try again later" })
        }

        res.status(200).json({
            status: "success",
            data: {
                id: userExits.id,
                first_name: userExits.first_name,
                last_name: userExits.last_name,
                email: userExits.email,
                phone: userExits.phone,
                role: userExits?.role ,
                createdAt: userExits.createdAt
            },
            token
        })



    } catch (error) {

    }
}

const logout = async (req, res) => {
    res.cookie("jwt", "", {
        httpOnly: true,
        expires: new Date(0)
    })

    res.status(200).json({
        status: "success",
        message: "User has successfully logged out"
    })
}


export { registerUser, loginUser, logout }