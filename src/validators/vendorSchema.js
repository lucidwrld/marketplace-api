import z from "zod";

const createVendorProfileSchema = z.object({
    storeName: z.string().trim().min(1, "Store name is required"),
    bankAccount: z.string().trim().min(1, "Bank Account number is required"),
    bankCode: z.string(),
})
const updateVendorProfileSchema = z.object({
    storeName: z.string().trim().min(1, "Store name is required").optional(),
    bankAccount: z.string().trim().min(1, "Bank Account number is required").optional(),
    bankCode: z.string().optional(),
})


export {createVendorProfileSchema, updateVendorProfileSchema}