import { processEligiblePayouts } from "./adminController.js";

export const runPayoutCron = async (req, res) => {
    const authHeader = req.headers["authorization"];

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    await processEligiblePayouts();
    return res.status(200).json({ status: "done" });
};