import z from "zod";


const registerUserSchema = z.object({
    first_name: z.string().trim()
    .min(1, "First Name is required")
    .min(2, "First Name should be atleast 2 characters"),
    last_name: z.string().trim()
        .min(1, "Last Name is required")
        .min(2, "Last Name should be atleast 2 characters"),
    email: z.string().trim().min(1, "Email is required")
        .min(2, "Email should be atleast 2 characters")
        .email("Provide a valid email").toLowerCase(),
    role: z.enum(["BUYER", "VENDOR",],"Role must either be a BUYER or VENDOR"),
    password: z.string().min(1, "Password is required")
    .min(6, "Password should be atleast 6 characters"),
    phone: z.string().min(1, "Phone Number is required")
})

const loginUserSchema = z.object({ 
    email: z.string().trim().min(1, "Email is required")
        .min(2, "Email should be atleast 2 characters")
        .email("Provide a valid email").toLowerCase(),
    password: z.string().min(1, "Password is required") 
})


export {registerUserSchema, loginUserSchema}