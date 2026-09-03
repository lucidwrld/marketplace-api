import express from "express"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { validateRequest } from "../middleware/validateRequest.js"
import { cancelOrderAsBuyer, cancelOrderItemStatus,  createOrder, getAllOrdersAsBuyer, getAllOrdersAsVendor, getOrderById, getOrderItemByIdasAdmin, getOrderItemByIdasVendor, getOrderItemsasAdmin, updateBuyerOrderItemStatus, updateOrderItemStatusAsAdmin } from "../controllers/orderController.js"
import { createOrderSchema, updateBuyerOrderItemStatusSchema, updateOrderItemStatusAsAdminSchema } from "../validators/orderSchema.js" 
import { confirmItemDelivery } from "../controllers/paymentController.js"

const router = express.Router()

router.use(authMiddleware)

router.post("/create", validateRequest(createOrderSchema), createOrder)
router.put("/update-buyer-order-item-status/:id", validateRequest(updateBuyerOrderItemStatusSchema), updateBuyerOrderItemStatus)
router.put("/update-order-item-status/:id", validateRequest(updateOrderItemStatusAsAdminSchema), updateOrderItemStatusAsAdmin)
router.put("/cancel-order-as-buyer/:id", cancelOrderAsBuyer)
router.put("/cancel-order-item/:id", cancelOrderItemStatus)
router.put("/confirm-order-as-buyer/:id", confirmItemDelivery)
router.get("/get-all-orders",getAllOrdersAsBuyer)
router.get("/get-all-vendor-orders",getAllOrdersAsVendor)
router.get("/get-order/:id",getOrderById)
router.get("/get-order-item/:id",getOrderItemByIdasVendor) 
router.get("/get-order-items-admin",getOrderItemsasAdmin) 
router.get("/get-order-item-admin/:id",getOrderItemByIdasAdmin) 

export default router