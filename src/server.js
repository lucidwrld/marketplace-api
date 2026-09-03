import "dotenv/config"
import express from "express"
import { connectDB, disconnectDB } from "./config/db.js"

import authRoutes from "./routes/authRoutes.js"
import vendorRoutes from "./routes/vendorRoutes.js"
import productRoutes from "./routes/productRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import reviewRoutes from "./routes/reviewRoutes.js"
import paymentRoutes from "./routes/paymentRoutes.js"
import { handlePaystackWebhook } from "./controllers/paymentController.js"

connectDB()

const app = express()


app.use("/api/webhooks/payment", express.raw({ type: "application/json" }),handlePaystackWebhook) //put this before express.json() so that the raw body doesn't get parse which would affect the setup

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use("/auth", authRoutes)
app.use("/vendor-profile", vendorRoutes)
app.use("/product", productRoutes)
app.use("/orders", orderRoutes)
app.use("/review", reviewRoutes)
app.use("/order", paymentRoutes)



let server

if (process.env.NODE_ENV === "development") {
    const PORT = 5001;

    server = app.listen(PORT, () => {
        console.log(`Server running on PORT ${PORT}`)
    })
}

process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection", err)
    server.close(async () => {
        await disconnectDB()
        process.exit(1)
    })
})

process.on("uncaughtException", async (err) => {
    console.error("Uncaught Exception", err)
    await disconnectDB() 
    process.exit(1)
})

process.on("SIGTERM", (err) => {
    console.error("SIGTERM", err)
    server.close(async () => {
        await disconnectDB()
        process.exit(0)
    })
})


export default app