import { prisma } from "../config/db.js"

const createOrder = async (req, res) => {
    try {
        const buyerId = req.user.id
        const { items } = req.body

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Order must include atleast one item" })
        }

        const order = await prisma.$transaction(async (tx) => {
            let totalAmount = 0
            const orderItemData = [];


            for (const el of items) {
                const { vendorId, productId, quantity } = el

                if (!vendorId || !productId || !quantity || quantity < 1) {
                    throw new Error("Each item requires a VendorId, Product Id and a valid quantity")
                }

                const product = await tx.product.findFirst({
                    where: { id: productId, vendorId: vendorId }
                })

                if (!product) {
                    throw new Error(`Product not found under vendor`);
                }

                if (product.stock < quantity) {
                    throw new Error(`Insufficient stock for "${product.title}"`);
                }

                totalAmount += Number(product.price) * quantity

                orderItemData.push({
                    productId,
                    vendorId,
                    quantity,
                    unitPrice: product.price
                });

                await tx.product.update({
                    where: { id: productId },
                    data: { stock: { decrement: quantity } }
                })

            }

            const createOrder = await tx.order.create({
                data: {
                    buyerId,
                    totalAmount,
                    status: "PENDING",
                    items: {
                        create: orderItemData
                    }
                },
                include: { items: true }
            });

            return createOrder
        })




        res.status(201).json({
            status: "success",
            data: order
        })


    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const syncOrderStatus = async (tx, orderId) => {
    const items = await tx.orderItem.findMany({
        where: { orderId },
    });

    if (items.length === 0) return;

    const statuses = items.map((i) => i.status);
    const allCancelled = statuses.every((s) => s === "CANCELLED");
    const allRefunded = statuses.every((s) => s === "REFUNDED");
    const allDelivered = statuses.every((s) => s === "DELIVERED" || s === "CANCELLED");
    const allShippedOrFurther = statuses.every((s) =>
        ["SHIPPED", "DELIVERED", "CANCELLED"].includes(s)
    );
    const anyShippedOrFurther = statuses.some((s) =>
        ["SHIPPED", "DELIVERED"].includes(s)
    );
    const anyDisputed = statuses.some((s) => s === "DISPUTED");

    let newStatus;

    if (allCancelled) {
        newStatus = "CANCELLED";
    } else if (allRefunded) {
        newStatus = "REFUNDED";
    } else if (anyDisputed) {
        newStatus = "DISPUTED";
    } else if (allDelivered) {
        newStatus = "CONFIRMED";
    } else if (allShippedOrFurther) {
        newStatus = "SHIPPED";
    } else if (anyShippedOrFurther) {
        newStatus = "PARTIALLY_SHIPPED";
    } else {
        // nothing shipped yet, leave whatever payment-stage status it already has
        return;
    }

    await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus, confirmedAt: newStatus === "CONFIRMED" ? new Date() : null },
    });
};


const updateBuyerOrderItemStatus = async (req, res) => {
    try {
        const { status } = req.body
        const userId = req.user.id
        const orderItemId = req.params.id




        const checkIfUserExistsAsAVendor = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })

        if (!checkIfUserExistsAsAVendor) {
            return res.status(404).json({ error: "User does not have a vendor profile" })
        }

        const checkIfUserIsTheVendorOfOrderItem = await prisma.orderItem.findFirst({
            where: { id: orderItemId, vendorId: checkIfUserExistsAsAVendor.id }
        })

        if (!checkIfUserIsTheVendorOfOrderItem) {
            return res.status(403).json({ error: "Vendor does not have permission to perform this action" })
        }
        if (checkIfUserIsTheVendorOfOrderItem.status === "PENDING" ){
            return res.status(400).json({error: "Buyer has not paid for this Item"})
        }

        const updatedOrderItem = await prisma.$transaction(async (tx) => {
            const updated = await tx.orderItem.update({
                where: { id: orderItemId },
                data: { status: status }
            })

            await syncOrderStatus(tx, updated.orderId)
            return updated
        })

        res.status(200).json({
            status: "success",
            message: "Order item successfully updated",
            data: updatedOrderItem
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const cancelOrderItemStatus = async (req, res) => {
    try {
        const userId = req.user.id
        const orderItemId = req.params.id
        const checkIfBuyerHasThisOrder = await prisma.orderItem.findUnique({
            where: { id: orderItemId, order: { buyerId: userId } }
        })

        if (!checkIfBuyerHasThisOrder) {
            return res.status(404).json({
                error: "Order Item does not exists"
            })
        }

        if (["SHIPPED", "DELIVERED"].includes(checkIfBuyerHasThisOrder.status)) {
            return res.status(400).json({ error: "Item has already shipped and can no longer be cancelled" });
        }


        const updatedOrderItem = await prisma.$transaction(async (tx) => {
            const updated = await tx.orderItem.update({
                where: { id: orderItemId },
                data: { status: "CANCELLED" },
            })

            await syncOrderStatus(tx, updated.orderId)

            return updated
        })

        res.status(200).json({
            status: "success",
            data: updatedOrderItem
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const cancelOrderAsBuyer = async (req, res) => {
    try {
        const buyerId = req.user.id
        const orderId = req.params.id

        const order = await prisma.order.findUnique({
            where: { id: orderId, buyerId: buyerId },
            include: { items: true }
        })

        if (!order) {
            return res.status(404).json({ error: "Order not found" })
        }

        const alreadyShipped = order.items.some((el) => ["SHIPPED", "DELIVERED"].includes(el.status))
        if (alreadyShipped) {
            return res.status(400).json({ error: "Order already has items shipped and can not be fully cancelled" })
        }

        await prisma.$transaction(async (tx) => {
            await tx.orderItem.updateMany({
                where: { orderId: orderId },
                data: { status: "CANCELLED" }
            })

            await syncOrderStatus(tx, orderId)
        })


        res.status(200).json({
            status: "success",
            message: "Order successfully cancelled"
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

/* const confirmOrderItemsStatusAsBuyer = async (req, res) => {
    try {
        const buyerId = req.user.id
        const orderItemId = req.params.id

        const orderItem = await prisma.orderItem.findUnique({
            where: { id: orderItemId, order: { buyerId: buyerId } }
        })

        if (!orderItem) {
            return res.status(404).json({
                error: "Order Item does not exists"
            })
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            const update = await tx.orderItem.update({
                where: { id: orderItemId },
                data: { status: "DELIVERED" },
                include: { order: true }
            })

            await syncOrderStatus(tx, update.order.id)

            return update
        })


        res.status(200).json({
            status: "success",
            data: updatedOrder
        })

    } catch (error) {
        res.status(400).json({
            error: error.message
        })
    }
} */

const getAllOrdersAsBuyer = async (req, res) => {
    try {
        const { page, pageSize } = req.query
        const userId = req.user.id


        const currentPage = Math.max(1, parseInt(page) || 1)
        const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 1))


        const [orders, totalItems] = await prisma.$transaction([
            prisma.order.findMany({
                where: { buyerId: userId },
                include: { items: true },
                skip: (currentPage - 1) * pageSizeNo,
                take: pageSizeNo,
                orderBy: { id: "desc" }
            }),
            prisma.order.count()
        ])

        res.status(200).json({
            status: "success",
            data: orders,
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

const getAllOrdersAsVendor = async (req, res) => {
    try {
        const userId = req.user.id
        const { page, pageSize,  } = req.query

        const currentPage = Math.max(1, parseInt(page) || 1)
        const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 20))


        const vendor = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })

        if (!vendor) {
            return res.status(404).json({ error: "User does not have a vendor profile" })
        }

        const where = {} 
        if (vendor.id) where.vendorId = vendor.id


        const [orders, totalItems] = await prisma.$transaction([
            prisma.orderItem.findMany({
                where,
                include: { order: true },
                skip: (currentPage - 1) * pageSizeNo,
                take: pageSizeNo,
                orderBy: { order: { createdAt: "desc" } }
            }), prisma.orderItem.count({ where })
        ])

        res.status(200).json({
            status: "success",
            data: orders,
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

const getOrderById = async (req, res) => {
    try {
        const userId = req.user.id
        const orderId = req.params.id
        const order = await prisma.order.findFirst({
            where: { id: orderId, buyerId: userId },
            include: { items: true }
        })

        res.status(200).json({
            status: "success",
            data: order
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getOrderItemByIdasVendor = async (req, res) => {
    try {
        const userId = req.user.id
        const orderItemId = req.params.id

        const vendor = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })

        if (!vendor) {
            return res.status(404).json({ error: "User does not have a vendor profile" })
        }

        const order = await prisma.orderItem.findFirst({
            where: { id: orderItemId, vendorId: vendor.id },
            include: { order: true }
        })

        res.status(200).json({
            status: "success",
            data: order
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const updateOrderItemStatusAsAdmin = async (req, res) => {
    try {
        const { status } = req.body
        const userId = req.user.id
        const orderItemId = req.params.id


        const checkIfUserExistsAsAdmin = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (checkIfUserExistsAsAdmin.role !== "ADMIN") {
            return res.status(403).json({ error: "User does not have a permission" })
        }


        const updatedOrderItem = await prisma.$transaction(async (tx) => {
            const updated = await tx.orderItem.update({
                where: { id: orderItemId },
                data: { status: status }
            })

            await syncOrderStatus(tx, updated.orderId)
            return updated
        })

        res.status(200).json({
            status: "success",
            message: "Order item successfully updated",
            data: updatedOrderItem
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getOrderItemsasAdmin = async (req, res) => {
    try {
        const orderItemStatusValues = ["PENDING", "SHIPPED", "DELIVERED", "DISPUTED", "REFUNDED", "CANCELLED"];
        const { page, pageSize,  status } = req.query

        const currentPage = Math.max(1, parseInt(page) || 1)
        const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 20))


        const user = req.user



        if (user.role !== "ADMIN") {
            return res.status(403).json({ error: "User does not permission" })
        }

        if (status && !orderItemStatusValues.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${orderItemStatusValues.join(", ")}` })
        }

        const where = {}
        if (status) where.status = status 

        const [orders, totalItems] = await prisma.$transaction([
            prisma.orderItem.findMany({
                where,
                include: { order: true },
                skip: (currentPage - 1) * pageSizeNo,
                take: pageSizeNo,
                orderBy: { order: { createdAt: "desc" } }
            }), 
            
            prisma.orderItem.count({ where })
        ])

        res.status(200).json({
            status: "success",
            data: orders,
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

const getOrderItemByIdasAdmin = async (req, res) => {
    try {
        const user = req.user
        const orderItemId = req.params.id

        if (user.role !== "ADMIN") {
            return res.status(403).json({ error: "User does not permission" })
        }

        const order = await prisma.orderItem.findFirst({
            where: { id: orderItemId },
            include: { order: true }
        })

        res.status(200).json({
            status: "success",
            data: order
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

export { syncOrderStatus,getOrderItemByIdasAdmin, getOrderItemsasAdmin, getAllOrdersAsBuyer, updateOrderItemStatusAsAdmin, getAllOrdersAsVendor, getOrderById, getOrderItemByIdasVendor, createOrder, updateBuyerOrderItemStatus, cancelOrderItemStatus, cancelOrderAsBuyer,  }