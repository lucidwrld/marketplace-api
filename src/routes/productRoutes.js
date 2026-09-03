import express from "express"
import { authMiddleware } from "../middleware/authMiddleware.js"
import { validateRequest } from "../middleware/validateRequest.js"
import { createProductSchema, updateProductSchema } from "../validators/productSchema.js"
import { createProduct, deleteProductAsAVendor, getAllProducts, getAllProductsAsAVendor, getAllVendorProductsAsBuyer, updateProduct } from "../controllers/productController.js"


const router = express.Router()

router.use(authMiddleware)

router.post("/create", validateRequest(createProductSchema), createProduct)
router.put("/update/:id", validateRequest(updateProductSchema), updateProduct)
router.delete("/delete/:id",  deleteProductAsAVendor)
router.get("/get-all-products", getAllProducts)
router.get("/get-all-vendor-product-as-buyer/:id", getAllVendorProductsAsBuyer)
router.get("/get-all-vendor-product", getAllProductsAsAVendor)

export default router