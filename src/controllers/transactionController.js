import { prisma } from "../config/db.js"

const getBuyerTransactions = async (req, res) => {
    try {
        const {page,pageSize} = req.query
        const userId = req.user.id


        const currentPage = Math.max(1, parseInt(page) || 1)
        const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 20))

        const where = {order: {buyerId: userId}}
        const [transactions, totalItems] = await prisma.$transaction([
            prisma.transaction.findMany({
            where,
            include: {order: true},
            skip: (currentPage - 1) * pageSizeNo,
            take: pageSizeNo,
            orderBy: {createdAt: "desc"}
        }), prisma.transaction.count({where})
        ])

        res.status(200).json({status: "success", data: transactions, pagination: {
            page: currentPage,
            pageSize: pageSizeNo,
            totalItems,
            totalPages: Math.ceil(totalItems/pageSizeNo)
        }})
    } catch (error) {
        res.status(400).json({error: error.message})
    }
}

const getVendorTransactions = async (req, res) => {
    try {
        const {page,pageSize} = req.query
        const userId = req.user.id
        const vendorProfile = await prisma.vendorProfile.findUnique({
            where: {userId: userId}
        })

        if(!vendorProfile){
            return res.status(400).json({error: "Not profile found"})
        }


        const currentPage = Math.max(1, parseInt(page) || 1)
        const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 20))
        const where =  {order: {items: {some: {vendorId: vendorProfile.id}}}}
        const [transactions, totalItems] = await prisma.$transaction([
            prisma.transaction.findMany({
            where,
            include: {order: {include: { items: {where: {vendorId: vendorProfile.id}}}}},
            skip: (currentPage - 1) * pageSizeNo,
            take: pageSizeNo,
            orderBy: {createdAt: "desc"}
        }), prisma.transaction.count({where})
        ])

        res.status(200).json({status: "success", data: transactions, pagination: {
            page: currentPage,
            pageSize: pageSizeNo,
            totalItems,
            totalPages: Math.ceil(totalItems/pageSizeNo)
        }})
    } catch (error) {
        res.status(400).json({error: error.message})
    }
}

export {getBuyerTransactions, getVendorTransactions}