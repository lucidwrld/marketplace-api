import z from "zod";


const createProductSchema = z.object({
    title: z.string().trim().min(1, "Product title is required"), 
    description: z.string().trim().min(1, "Product description is required"), 
    price: z.coerce.number().positive("Price must be above 0").min(1, "Product price is required"), 
    stock: z.int("Product stock must be an integer").min(0, "Product stock is required"), 
    imageUrl: z.string().optional(), 
    isActive: z.boolean().optional()
})

const updateProductSchema = z.object({
    title: z.string().trim().min(1, "Product title is required").optional(), 
    description: z.string().trim().min(1, "Product description is required").optional(), 
    price: z.coerce.number().positive("Price must be above 0").min(1, "Product price is required").optional(), 
    stock: z.int("Product stock must be an integer").min(0, "Product stock is required").optional(), 
    imageUrl: z.string().optional(), 
    isActive: z.boolean().optional()
})

export {createProductSchema, updateProductSchema}