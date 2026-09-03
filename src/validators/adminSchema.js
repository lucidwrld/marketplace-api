import z from "zod";

const verifyVendorSchema = z.object({
    isVerified: z.boolean("isVerified must be a boolean value")
})


export {verifyVendorSchema}