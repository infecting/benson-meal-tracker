import express, { Request, Response } from "express";

const router = express.Router();

// Endpoint to get scheduled order processor status
router.get("/schedulerStatus", (req: Request, res: Response) => {
    // In a real implementation, you might want to check if the processor is actually running
    res.json({
        isRunning: true, // This would come from your actual scheduler instance
        message: "Scheduled order processor status",
    });
});

// Endpoint to manually trigger scheduled order processing (for testing)
router.post("/triggerScheduledOrders", async (req: Request, res: Response) => {
    try {
        // Only allow this in development/testing
        if (process.env.NODE_ENV === "production") {
            res.status(403).json({ error: "Not allowed in production" });
            return;
        }

        // You would need to pass the actual scheduler instance here
        // This is just a placeholder - in the main server file, you'd have access to the scheduler
        res.json({
            message: "Scheduled order processing would be triggered manually",
            note: "This endpoint needs access to the scheduler instance",
        });
    } catch (error) {
        console.error("Error triggering scheduled orders:", error);
        res.status(500).json({
            error: "Failed to trigger scheduled order processing",
        });
    }
});

export default router;
