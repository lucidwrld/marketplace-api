import z from "zod";

const createOrderSchema = z.object({
    items: z.array(z.object({
        vendorId: z.string().uuid("Enter a valid Id"), 
        productId: z.string().uuid("Enter a valid Id"), 
        quantity: z.int("Quantity must be a whole number").positive("Enter a postive integer").min(1, "Quantity can not be less than 1 ")
    })).min(1, "Order needs atleast one Item")
})
 

const updateOrderItemStatusAsAdminSchema = z.object({
    status: z.enum(["DISPUTED",
  "REFUNDED"], "status can either be DISPUTED or REFUNDED")
})

export {createOrderSchema,  updateOrderItemStatusAsAdminSchema}