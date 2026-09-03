import { prisma } from "../config/db.js"

const createProduct = async (req, res) => {
    try {
        const { title, description, price, stock, imageUrl, isActive } = req.body
        const userId = req.user.id

        const checkIfUserIsHasAVendorProfile = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })

        if (!checkIfUserIsHasAVendorProfile) {
            return res.status(404).json({ error: "User does not have a vendor profile" })
        }

        const createdProduct = await prisma.product.create({
            data: {
                title,
                description,
                price,
                stock,
                imageUrl,
                isActive,
                vendorId: checkIfUserIsHasAVendorProfile.id
            }
        })

        res.status(201).json({
            status: "success",
            data: createdProduct
        })


    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const updateProduct = async (req, res) => {
    try {
        const { title, description, price, stock, imageUrl, isActive } = req.body
        const userId = req.user.id
        const productId = req.params.id

        const checkIfUserIsHasAVendorProfile = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })



        if (!checkIfUserIsHasAVendorProfile) {
            return res.status(404).json({ error: "User does not have a vendor profile" })
        }

        const checkIfProductExist = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!checkIfProductExist) {
            return res.status(404).json({ error: "Product does not exists" })
        }

        if (checkIfProductExist.vendorId !== checkIfUserIsHasAVendorProfile.id) {
            return res.status(404).json({ error: "User does not have permission to perform this action" })
        }

        const updatedData = {}
        if (title !== undefined) updatedData.title = title
        if (description !== undefined) updatedData.description = description
        if (price !== undefined) updatedData.price = price
        if (stock !== undefined) updatedData.stock = stock
        if (imageUrl !== undefined) updatedData.imageUrl = imageUrl
        if (isActive !== undefined) updatedData.isActive = isActive


        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: updatedData
        })

        res.status(200).json({
            status: "success",
            data: updatedProduct
        })


    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getAllProducts = async (req, res) => {
    try {
        const { page, pageSize, search } = req.query

        const currentPage = Math.max(1, parseInt(page) || 1)
        const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 20))


        const where = { isActive: true }
        if (search) where.title = search

        const [allProducts, totalItems] = await prisma.$transaction([
            prisma.product.findMany({
                where,
                skip: (currentPage - 1) * pageSizeNo,
                take: pageSizeNo,
                orderBy: { createdAt: "desc" }
            }), prisma.product.count({ where })
        ])

        res.status(200).json({
            status: "success",
            data: allProducts,
            pagination: {
                page: currentPage,
                pageSize: pageSizeNo,
                totalItems,
                totalPages: Math.ceil(totalItems / pageSizeNo)
            }
        })
    } catch (error) {

    }
}

const getAllVendorProductsAsBuyer = async (req, res) => {
    try {
        const vendorId = req.params.id
        const { page, pageSize, search } = req.query

        const currentPage = Math.max(1, parseInt(page) || 1)
        const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 20))

        const where = {isActive: true}
        if (search) where.title = search
        if(vendorId) where.vendorId = vendorId

        
        const [allProducts, totalItems] = await prisma.$transaction([
            prisma.product.findMany({
                where,
                skip: (currentPage - 1) * pageSizeNo,
                take: pageSizeNo,
                orderBy: {createdAt: "desc"}
            }), prisma.product.count({where})
        ])

        res.status(200).json({
            status: "success",
            data: allProducts,
            pagination: {
                page: currentPage,
                pageSize: pageSizeNo,
                totalItems,
                totalPages: Math.ceil(totalItems/pageSizeNo)
            }
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getAllProductsAsAVendor = async (req, res) => {
    try {
        const userId = req.user.id

        const checkIfUserExistsAsAVendor = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })


        if (!checkIfUserExistsAsAVendor) {
            return res.status(404).json({
                error: "User does not have a vendor profile"
            })
        }

        const allProducts = await prisma.product.findMany({
            where: { vendorId: checkIfUserExistsAsAVendor.id }
        })

        res.status(200).json({
            status: "success",
            data: allProducts,
            
            pagination: {
                page: currentPage,
                pageSize: pageSizeNo,
                totalItems,
                totalPages: Math.ceil(totalItems/pageSizeNo)
            }
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const deleteProductAsAVendor = async (req, res) => {
    try {
        const userId = req.user.id
        const productId = req.params.id
        const checkIfUserExistsAsAVendor = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })

        if (!checkIfUserExistsAsAVendor) {
            return res.status(404).json({
                error: "User does not have a vendor profile"
            })
        }

        const checkIfProductExists = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!checkIfProductExists) {
            return res.status(404).json({
                error: "Product does not exists"
            })
        }

        if (checkIfProductExists.vendorId !== checkIfUserExistsAsAVendor.id) {
            return res.status(403).json({
                error: "User does not have permission to perform this action"
            })
        }

        res.status(200).json({
            status: "success",
            message: "Product successfully deleted"
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}



export { createProduct, updateProduct, getAllProducts, getAllProductsAsAVendor, getAllVendorProductsAsBuyer, deleteProductAsAVendor }

