import axios from "axios"
import crypto from "crypto"
import { prisma } from "../config/db.js";
import { syncOrderStatus } from "./orderController.js";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PLATFORM_FEE_PERCENT = 5;


const initializePayment = async (req, res) => { 
    try {
        const userId = req.user.id
        const orderId = req.params.id 
        const order = await prisma.order.findUnique({
            where: { id: orderId, buyerId: userId, status: "PENDING" }
        })

        if (!order) {
            return res.status(404).json({ error: "Order not found or already paid" })
        }


        const response = await axios.post("https://api.paystack.co/transaction/initialize", {
            email: req.user.email,
            amount: Math.round(Number(order.totalAmount) * 100),
            metadata: { orderId: order.id }
        }, { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } })



        return res.status(200).json({
            status: "success",
            data: {
                authorizationUrl: response.data.data.authorization_url,
                reference: response.data.data.reference
            }
        })
    } catch (error) {
        console.error({ error: error.message, code: error.code })
        return res.status(400).json({ error: error.message })
    }
}

const handlePaystackWebhook = async (req, res) => {
    try {
        const hash = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY).update(req.body).digest("hex")
        if (hash !== req.headers["x-paystack-signature"]) {
            return res.status(401).json({ error: "Invalid Signature" })
        }

        const event = JSON.parse(req.body)

        if (event.event === "charge.success") {
            const { reference, amount, metadata } = event.data;
            const orderId = metadata.orderId
 
            await prisma.$transaction(async (tx) => {
                const order = await tx.order.findUnique({
                    where: { id: orderId }
                })
                if(!order) return
                const existing = await tx.transaction.findUnique({
                    where: { reference: reference, orderId: orderId }
                })

                if (existing) return

                await tx.transaction.create({
                    data: {
                        orderId: orderId,
                        provider: "paystack",
                        amount: amount / 100,
                        isEscrow: true,
                        reference: reference

                    }
                })

                await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: "PAID"
                    }
                })

                await tx.orderItem.updateMany({
                    where: { orderId: orderId, status: "PENDING" },
                    data: { status: "PAID" }
                })
            })



        }


        return res.status(200).json({ received: true })
    } catch (error) {
        return res.status(200).json({ received: true });
    }
}

const confirmItemDelivery = async (req, res) => {
    try {
        const userId = req.user.id
        const orderItemId = req.params.id


        const orderItem = await prisma.orderItem.findFirst({
            where: { id: orderItemId, order: { buyerId: userId } }
        })

        if (!orderItem) {
            res.status(404).json({ error: "Order does not exists" })
        }

       if (orderItem.status !== "SHIPPED") {
            res.status(400).json({ error: "Can not confirm order that has not been shipped" })
        } 


        await prisma.$transaction(async (tx) => {
            await tx.orderItem.update({
                where: { id: orderItemId },
                data: { status: "DELIVERED" }
            })


            await syncOrderStatus(tx, orderItem.orderId) 
            const vendorItemsOnOrder = await tx.orderItem.findMany({
                where: { orderId: orderItem.orderId, vendorId: orderItem.vendorId }
            })


            const vendorFullyDeliveredEverything = vendorItemsOnOrder.every(
                (item) => item.status === "DELIVERED" || item.status === "CANCELLED"
            )

            if (vendorFullyDeliveredEverything) {
                const existingPayout = await tx.payout.findFirst({
                    where: { orderId: orderItem.orderId, vendorId: orderItem.vendorId }
                })


                if (!existingPayout) {
                    const vendorTotal = vendorItemsOnOrder.filter((item) => item.status === "DELIVERED").reduce((sum, item) => sum + (Number(item.unitPrice) * item.quantity), 0)

                    const platformFeeAmount = vendorTotal * (PLATFORM_FEE_PERCENT / 100)
                    const netAmount = vendorTotal - platformFeeAmount

                    const availableAt = new Date();
                    availableAt.setMinutes(availableAt.getMinutes() + 3) //setHours(availableAt.getHours() + 24); //set the payout time. 24 hours from now

                    
                    await tx.payout.create({
                        data: {
                            vendorId: orderItem.vendorId,
                            orderId: orderItem.orderId,
                            grossAmount: vendorTotal,
                            platformFeePercent: PLATFORM_FEE_PERCENT,
                            platformFeeAmount,
                            amount: netAmount,
                            availableAt,
                            status: "PENDING",
                        }
                    })
                }
            }
        })

        res.status(201).json({
            status: "success",
            message: "Delivery confirmed"
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

export { initializePayment, handlePaystackWebhook, confirmItemDelivery }