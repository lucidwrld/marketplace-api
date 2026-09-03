import { prisma } from "../config/db.js"


const createVendorProfile = async (req, res) => {
    try {
        const { storeName, bankAccount, bankCode } = req.body
        const userId = req.user.id

        const checkIfUserExists = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!checkIfUserExists) {
            return res.status(404).json({ error: "Account not found, can't create vendor profile" })
        }

        if (checkIfUserExists.role !== "VENDOR") {
            return res.status(400).json({ error: "User can't not create a vendor due to role" })
        }

        const checkIfUserExistsAsAVendor = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })

        if (checkIfUserExistsAsAVendor) {
            return res.status(400).json({ error: "User is has a vendor profile already" })
        }



        const vendorProfile = await prisma.vendorProfile.create({
            data: {
                storeName,
                bankAccount,
                bankCode,
                userId
            }
        })

        res.status(201).json({
            status: "success",
            data: {
                id: vendorProfile.id,
                storeName,
                bankAccount,
                bankCode,
                userId,
                isVerified: vendorProfile.isVerified,
                createdAt: vendorProfile.createdAt
            }
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getVendorProfile = async (req, res) => {
    try {
        const userId = req.user.id

        const confirmUserExistsAsAVendor = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })

        if (!confirmUserExistsAsAVendor) {
            return res.status(404).json({ error: "Vendor Profile does not exist" })
        }


        res.status(200).json({
            status: "success",
            data: {
                id: confirmUserExistsAsAVendor.id,
                storeName: confirmUserExistsAsAVendor.storeName,
                bankAccount: confirmUserExistsAsAVendor.bankAccount,
                bankCode: confirmUserExistsAsAVendor.bankCode,
                userId: confirmUserExistsAsAVendor.userId,
                isVerified: confirmUserExistsAsAVendor.isVerified,
                createdAt: confirmUserExistsAsAVendor.createdAt
            }
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const updateVendorProfile = async (req, res) => {
    try {
        const { storeName, bankAccount, bankCode } = req.body
        const userId = req.user.id
        const vendorId = req.params.id

        const checkIfUserExistsAsAVendor = await prisma.vendorProfile.findUnique({
            where: { id: vendorId }
        })

        if (!checkIfUserExistsAsAVendor) {
            return res.status(404).json({ error: "Vendor Profile not Found" })
        }

        if (checkIfUserExistsAsAVendor.userId !== userId) {
            return res.status(401).json({ error: "You do not have permission to perform this action" })
        }





        const updatedData = {}
        if (storeName !== undefined) updatedData.storeName = storeName
        if (bankAccount !== undefined) updatedData.bankAccount = bankAccount
        if (bankCode !== undefined) updatedData.bankCode = bankCode

        const vendorProfile = await prisma.vendorProfile.update({
            where: { id: vendorId },
            data: updatedData
        })

        res.status(200).json({
            status: "success",
            data: {
                id: vendorProfile.id,
                storeName,
                bankAccount: vendorProfile.bankAccount,
                bankCode: vendorProfile.bankCode,
                userId,
                isVerified: vendorProfile.isVerified,
                createdAt: vendorProfile.createdAt
            }
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const deleteVendorProfile = async (req, res) => {
    try {
        const vendorId = req.params.id
        const userId = req.user.id

        const checkUserHasPermission = await prisma.vendorProfile.findUnique({
            where: { id: vendorId }
        })

        if (!checkUserHasPermission) {
            return res.status(404).json({ error: "Vendor Profile does not exists" })
        }

        if (checkUserHasPermission.userId !== userId) {
            return res.status(401).json({ error: "You do not have permission to perform this action" })
        }



        await prisma.vendorProfile.delete({
            where: { id: vendorId }
        })

        res.status(200).json({
            status: "success",
            message: "Vendor Profile successfully deleted"
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getAllVendors = async (req, res) => {
    try {
       const {page, pageSize, search} = req.query
       
       const currentPage = Math.max(1, parseInt(page) || 1)
       const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 20))

        const where = {}
        if(search) where.storeName = search
       const [vendors, totalItems] = await prisma.$transaction([
            prisma.vendorProfile.findMany({
                where,
                skip: (currentPage - 1) * pageSizeNo,
                take: pageSizeNo,
                orderBy: {createdAt: "desc"}
            })
        , prisma.vendorProfile.count({where}) 
       ])

       res.status(200).json({
        status: "success",
        data: vendors,
        pagination: {
            page: currentPage,
            pageSize: pageSizeNo,
            totalItems,
            totalPages: Math.ceil(totalItems/pageSizeNo)

        }
       })
    } catch (error) {
       res.status(400).json({error: error.message}) 
    }
}

export { getAllVendors,createVendorProfile, getVendorProfile, updateVendorProfile, deleteVendorProfile }