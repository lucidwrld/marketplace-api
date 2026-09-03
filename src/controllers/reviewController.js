import { prisma } from "../config/db.js"


const createReview = async (req, res) => {
    try {
        const {rating, comment} = req.body
        const productId = req.params.id
        const userId = req.user.id 

        const product = await prisma.product.findUnique({
            where: {id: productId}
        })

        if(!product){
            return res.status(400).json({error: "Product not found"})
        }

        const review = await prisma.review.create({
            data: {
                rating,
                comment,
                productId,
                userId
            },
            include: {product: true, user: true}
        })

        res.status(201).json({
            status: "success",
            data: review
        })
    } catch (error) {
        res.status(400).json({error: error.message})
    }
    
}

const updateReview = async (req, res) => {
    try {
        const {rating, comment} = req.body
        const reviewId = req.params.id
        const userId = req.user.id 
 
        const review = await prisma.review.findUnique({
            where: {id: reviewId, userId: userId}
        })

        if(!review){
            return res.status(400).json({error: "Review not found"})
        }

        const updatedData = {}
        if(rating !== undefined) updatedData.rating = rating
        if(comment !== undefined) updatedData.comment = comment

        const updatedReview = await prisma.review.update({
            where: {id: reviewId},
            data:updatedData,
            include: {product: true, user: true}
        })

        res.status(200).json({
            status: "success",
            data: updatedReview
        })
    } catch (error) {
        res.status(400).json({error: error.message})
    }
    
}

const deleteReview = async(req, res) => {
    try {
       const reviewId = req.params.id
       const userId = req.user.id
       
       const review = await prisma.review.findUnique({
        where: {id: reviewId, userId: userId}
       })

       if(!review){
        return res.status(404).json({error: "Review not found"})
       }

       await prisma.review.delete({
            where: {id: reviewId, userId: userId}
       })

       res.status(200).json({
        status: "success",
        message: "Review deleted successfully"
       })
    } catch (error) {
        res.status(400).json({
            error: error.message
        })
    }

}

const getProductReviews = async (req, res) => {
    try {
        const productId = req.params.id

        const reviews = await prisma.review.findMany({
            where: {productId: productId},
            include: {user: true, product: true},
            orderBy: {createdAt: "desc"}
        })

        res.status(200).json({
            status: "success",
            data: reviews
        }) 
    } catch (error) {
        res.status(400).json({
            error: error.message
        })
    }
}

export {createReview, updateReview, deleteReview, getProductReviews}