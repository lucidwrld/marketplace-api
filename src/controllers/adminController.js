import axios from "axios"
import { prisma } from "../config/db.js"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PLATFORM_FEE_PERCENT = 5;
const getAdminPayouts = async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "You do not have the permission" })
        }

        const statusEnums = ["PENDING", "PROCESSING", "PAID", "FAILED"]
        const { page, pageSize, status } = req.query

        const currentPage = Math.max(1, parseInt(page) || 1)
        const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 20))

        if (status && !statusEnums.includes(status)) {
            return res.status(400).json({ error: "Status can only me PENDING | PROCESSING | PAID | FAILED" })
        }


        const where = {}
        if (status) where.status = status
        const [payouts, totalItems] = await prisma.$transaction([
            prisma.payout.findMany({
                where,
                skip: (currentPage - 1) * pageSizeNo,
                take: pageSizeNo,
                orderBy: { createdAt: "desc" },
                include: { order: true, vendor: true }
            }), prisma.payout.count({ where })
        ])


        res.status(200).json({
            status: "success",
            data: payouts,
            pagination: {
                page: currentPage,
                pageSize: pageSizeNo,
                totalItems,
                totalPages: Math.ceil(totalItems / pageSizeNo)
            }
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getAdminRevenue = async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "You do not have the permission" })
        }



        const revenue = await prisma.payout.aggregate({
            where: { status: "PAID" },
            _sum: { platformFeeAmount: true }
        })


        res.status(200).json({
            status: "success",
            data: {
                revenue: revenue
            },

        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getAdminGetVendors = async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "You do not have the permission" })
        }

        const { page, pageSize, isVerified } = req.query

        const currentPage = Math.max(1, parseInt(page) || 1)
        const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 20))

        if (isVerified && !Boolean(isVerified)) {
            return res.status(400).json({ error: "isVerified can only be a boolean value" })
        }


        const where = {}
        if (isVerified) where.isVerified = isVerified
        const [vendors, totalItems] = await prisma.$transaction([
            prisma.vendorProfile.findMany({
                where,
                skip: (currentPage - 1) * pageSizeNo,
                take: pageSizeNo,
                orderBy: { createdAt: "desc" }, 
            }),  prisma.payout.count({ where })
        ])


        res.status(200).json({
            status: "success",
            data: vendors,
            pagination: {
                page: currentPage,
                pageSize: pageSizeNo,
                totalItems,
                totalPages: Math.ceil(totalItems / pageSizeNo)
            }
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getAdminVendorById  = async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "You do not have the permission" })
        }
        const vendorId = req.params.id 

        const vendor = await prisma.vendorProfile.findUnique({
            where: {id: vendorId}
        })

        if(!vendor){
            return res.status(404).json({error: "Vendor not found"})
        }

        res.status(200).json({
            status: "success",
            data: vendor
        })
    } catch (error) {
         res.status(400).json({error: error.message})
    }
}

const verifyVendor = async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "You do not have the permission" })
        }
        const vendorId = req.params.id 
        const {isVerified} = req.body

        const vendor = await prisma.vendorProfile.findUnique({
            where: {id: vendorId}
        })

        if(!vendor){
            return res.status(404).json({error: "Vendor not found"})
        }

        const updatedVendor = await prisma.vendorProfile.update({
            where: {id: vendorId},
            data: {isVerified: isVerified}
        })

        res.status(200).json({
            status: "success",
            data: updatedVendor
        })

    } catch (error) {
            res.status(400).json({error: error.message})
    }
}





const processEligiblePayouts = async () => {
    const eligiblePayouts = await prisma.payout.findMany({
        where: {
            status: "PENDING",
            availableAt: { lte: new Date() }, // the 24hr hold has passed
        },
        include: { vendor: true },
    });

    for (const payout of eligiblePayouts) {
        try {
            await prisma.payout.update({
                where: { id: payout.id },
                data: { status: "PROCESSING" },
            });

            // Call Paystack's Transfer API using the vendor's registered bank details
            const transferResponse = await axios.post(
                "https://api.paystack.co/transfer",
                {
                    source: "balance",
                    amount: Math.round(Number(payout.amount) * 100), // kobo
                    recipient: payout.vendor.paystackRecipientCode,
                    reason: `Payout for order ${payout.orderId}`,
                },
                { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
            );

            await prisma.payout.update({
                where: { id: payout.id },
                data: {
                    status: "PAID",
                    paidAt: new Date(),
                    reference: transferResponse.data.data.reference,
                },
            });
        } catch (error) {
            console.error(`Payout ${payout.id} failed:`, error.message);
            await prisma.payout.update({
                where: { id: payout.id },
                data: { status: "FAILED", failureReason: {error: error, message: error.message} },
            });

        }
    }
};


export { getAdminPayouts, getAdminRevenue, processEligiblePayouts, verifyVendor, getAdminGetVendors, getAdminVendorById }