import z from "zod";

const resolveAccountNumberSchema = z.object({
    bankAccount: z.string().trim().min(1, "Bank Account is required "), 
    bankCode: z.string().trim().min(1, "Bank Code is required ")
})

export {resolveAccountNumberSchema}