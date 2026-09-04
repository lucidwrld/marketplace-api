import axios from "axios";
import { prisma } from "../config/db.js"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

// --- Helper: verify the account number actually belongs to that bank ---
const resolveAccountNumber = async (bankAccount, bankCode) => {
    const response = await axios.get(
        `https://api.paystack.co/bank/resolve?account_number=${bankAccount}&bank_code=${bankCode}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    return response.data.data.account_name;
};

// --- Helper: create a Paystack transfer recipient, returns the recipient_code ---
const createPaystackRecipient = async (accountName, bankAccount, bankCode) => {
    const response = await axios.post(
        "https://api.paystack.co/transferrecipient",
        {
            type: "nuban",
            name: accountName,
            account_number: bankAccount,
            bank_code: bankCode,
            currency: "NGN",
        },
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } }
    );
    return response.data.data.recipient_code;
};

const getBankDetails = async (req, res) => {
    try {
        const { bankAccount, bankCode } = req.body


        let accountName;
        try {
            accountName = await resolveAccountNumber(bankAccount, bankCode);
        } catch (err) {
            return res.status(400).json({ error: "Could not verify bank account, check the account number and bank code" });
        }

        res.status(200).json({
            status: "success",
            data: {
                "Account Name": accountName
            }
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}



const createVendorProfile = async (req, res) => {
    try {
        const { storeName, bankAccount, bankCode } = req.body
        const userId = req.user.id

        const checkIfUserExists = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!checkIfUserExists) {
            return res.status(404).json({ error: "Account not found, can't create vendor profile" })
        }

        if (checkIfUserExists.role !== "VENDOR") {
            return res.status(400).json({ error: "User can't not create a vendor due to role" })
        }

        const checkIfUserExistsAsAVendor = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })

        if (checkIfUserExistsAsAVendor) {
            return res.status(400).json({ error: "User is has a vendor profile already" })
        }

        let accountName;
        try {
            accountName = await resolveAccountNumber(bankAccount, bankCode);
        } catch (err) {
            return res.status(400).json({ error: "Could not verify bank account, check the account number and bank code" });
        }

        const paystackRecipientCode = await createPaystackRecipient(accountName, bankAccount, bankCode);


        const vendorProfile = await prisma.vendorProfile.create({
            data: {
                storeName,
                bankAccount,
                bankCode,
                userId,
                paystackRecipientCode
            }
        })

        res.status(201).json({
            status: "success",
            data: vendorProfile
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getVendorProfile = async (req, res) => {
    try {
        const userId = req.user.id

        const confirmUserExistsAsAVendor = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })

        if (!confirmUserExistsAsAVendor) {
            return res.status(404).json({ error: "Vendor Profile does not exist" })
        }


        res.status(200).json({
            status: "success",
            data: {
                id: confirmUserExistsAsAVendor.id,
                storeName: confirmUserExistsAsAVendor.storeName,
                bankAccount: confirmUserExistsAsAVendor.bankAccount,
                bankCode: confirmUserExistsAsAVendor.bankCode,
                userId: confirmUserExistsAsAVendor.userId,
                isVerified: confirmUserExistsAsAVendor.isVerified,
                createdAt: confirmUserExistsAsAVendor.createdAt
            }
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const updateVendorProfile = async (req, res) => {
    try {
        const { storeName, bankAccount, bankCode } = req.body
        const userId = req.user.id
        const vendorId = req.params.id

        const checkIfUserExistsAsAVendor = await prisma.vendorProfile.findUnique({
            where: { id: vendorId }
        })

        if (!checkIfUserExistsAsAVendor) {
            return res.status(404).json({ error: "Vendor Profile not Found" })
        }

        if (checkIfUserExistsAsAVendor.userId !== userId) {
            return res.status(403).json({ error: "You do not have permission to perform this action" })
        }





        const updatedData = {}
        if (storeName !== undefined) updatedData.storeName = storeName


        const bankDetailsChanged = (bankAccount !== undefined && bankAccount !== checkIfUserExistsAsAVendor.bankAccount) || (bankCode !== undefined && bankCode !== checkIfUserExistsAsAVendor.bankCode);

        if (bankDetailsChanged) {
            const newBankAccount = bankAccount ?? checkIfUserExistsAsAVendor.bankAccount;
            const newBankCode = bankCode ?? checkIfUserExistsAsAVendor.bankCode;

            let accountName;
            try {
                accountName = await resolveAccountNumber(newBankAccount, newBankCode);
            } catch (err) {
                return res.status(400).json({ error: "Could not verify bank account, check the account number and bank code" });
            }

            // Regenerate the recipient code, the old one still points at the old account
            const newRecipientCode = await createPaystackRecipient(accountName, newBankAccount, newBankCode);

            updatedData.bankAccount = newBankAccount;
            updatedData.bankCode = newBankCode;
            updatedData.paystackRecipientCode = newRecipientCode;
            updatedData.isVerified = false;
        }


        const vendorProfile = await prisma.vendorProfile.update({
            where: { id: vendorId },
            data: updatedData
        })

        res.status(200).json({
            status: "success",
            data: vendorProfile
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const deleteVendorProfile = async (req, res) => {
    try {
        const vendorId = req.params.id
        const userId = req.user.id

        const checkUserHasPermission = await prisma.vendorProfile.findUnique({
            where: { id: vendorId }
        })

        if (!checkUserHasPermission) {
            return res.status(404).json({ error: "Vendor Profile does not exists" })
        }

        if (checkUserHasPermission.userId !== userId) {
            return res.status(403).json({ error: "You do not have permission to perform this action" })
        }



        await prisma.vendorProfile.delete({
            where: { id: vendorId }
        })

        res.status(200).json({
            status: "success",
            message: "Vendor Profile successfully deleted"
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getAllVendors = async (req, res) => {
    try {
        const { page, pageSize, search } = req.query

        const currentPage = Math.max(1, parseInt(page) || 1)
        const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 20))

        const where = {}
        if (search) where.storeName = { contains: search, mode: "insensitive" };
        const [vendors, totalItems] = await prisma.$transaction([
            prisma.vendorProfile.findMany({
                where,
                skip: (currentPage - 1) * pageSizeNo,
                take: pageSizeNo,
                orderBy: { createdAt: "desc" }
            })
            , prisma.vendorProfile.count({ where })
        ])

        res.status(200).json({
            status: "success",
            data: vendors,
            pagination: {
                page: currentPage,
                pageSize: pageSizeNo,
                totalItems,
                totalPages: Math.ceil(totalItems / pageSizeNo)

            }
        })
    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

const getPayouts = async (req, res) => {
    try {
        const userId = req.user.id
        const statusEnums = ["PENDING", "PROCESSING", "PAID", "FAILED"]
        const { page, pageSize, status } = req.query

        const currentPage = Math.max(1, parseInt(page) || 1)
        const pageSizeNo = Math.min(100, Math.max(1, parseInt(pageSize) || 20))

        if (status && !statusEnums.includes(status)) {
            return res.status(400).json({ error: "Status can only me PENDING | PROCESSING | PAID | FAILED" })
        }
        const vendorProfile = await prisma.vendorProfile.findUnique({
            where: { userId: userId }
        })

        if (!vendorProfile) {
            return res.status(404).json({ error: "Vendor profile not found" })
        }

        const where = { vendorId: vendorProfile.id }
        if (status) where.status = status
        const [payouts, totalItems] = await prisma.$transaction([
            prisma.payout.findMany({
                where,
                skip: (currentPage - 1) * pageSizeNo,
                take: pageSizeNo,
                orderBy: { createdAt: "desc" },
                include: { order: true }
            }), prisma.payout.count({ where })
        ])


        res.status(200).json({
            status: "success",
            data: payouts,
            pagination: {
                page: currentPage,
                pageSize: pageSizeNo,
                totalItems,
                totalPages: Math.ceil(totalItems / pageSizeNo)
            }
        })

    } catch (error) {
        res.status(400).json({ error: error.message })
    }
}

export { resolveAccountNumber, getBankDetails,getAllVendors, getPayouts, createVendorProfile, getVendorProfile, updateVendorProfile, deleteVendorProfile }