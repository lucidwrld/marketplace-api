import {PrismaNeon} from "@prisma/adapter-neon"
import {PrismaClient} from "@prisma/client"
const adapter = new PrismaNeon({connectionString: process.env.DATABASE_URL})

const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
})

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("DB connected successfully to Prisma")
    } catch (error) {
        console.error(`Database connection error: ${error.message}`)
        process.exit(1)
    }
}

const disconnectDB = async () => {
    await prisma.$disconnect()
}

export {prisma,connectDB, disconnectDB}