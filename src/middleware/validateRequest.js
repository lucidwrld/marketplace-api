
export const validateRequest = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body)

        if(!result.success){
            const errorMessages = result.error.issues.map((issue) => ({
                Field: issue.path.join("."),
                Message: issue.message
            })) 

            return res.status(400).json(errorMessages)

        }

        next()
    }

} 