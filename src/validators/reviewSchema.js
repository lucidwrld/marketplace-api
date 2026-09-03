import z from "zod";

const createReviewSchema = z.object({
    rating: z.coerce.number().positive("Enter a valid number").min(1, "Rating is required").max(5, "Rating ranges between 1 - 5"),
    comment: z.string().optional()
})

const updateReviewSchema = z.object({
    rating: z.coerce.number().positive("Enter a valid number").min(1, "Rating is required").max(5, "Rating ranges between 1 - 5").optional(),
    comment: z.string().optional()
})

export {createReviewSchema, updateReviewSchema}