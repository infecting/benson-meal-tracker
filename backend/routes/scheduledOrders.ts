import express, { Request, Response } from "express";
import { authenticateUser } from "../middleware/auth";
import { ScheduleOrder } from "../database/schemas";

const router = express.Router();

// Schedule an order
router.post("/scheduleOrder", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        // Validate required fields
        const {
            userEmail,
            locationId,
            locationName,
            items,
            cartItems,
            total,
            specialRequest,
            scheduledTime,
            notes,
        } = req.body;

        if (
            !userEmail ||
            !locationId ||
            !items ||
            !cartItems ||
            !total ||
            !scheduledTime
        ) {
            res.status(400).json({
                error:
                    "Missing required fields: userEmail, locationId, items, cartItems, total, and scheduledTime are required",
            });
            return;
        }

        // Validate scheduledTime is in the future
        const scheduleDate = new Date(scheduledTime);
        const now = new Date();
        if (scheduleDate <= now) {
            res.status(400).json({
                error: "Scheduled time must be in the future",
            });
            return;
        }

        // Create the schedule order
        const newScheduledOrder = new ScheduleOrder({
            userId: user.userId,
            userEmail: user.email || userEmail,
            locationId,
            locationName,
            items,
            cartItems, // Store raw cart items for processing
            total,
            specialRequest: specialRequest || "",
            scheduledTime: scheduleDate,
            notes: notes || "",
        });

        // Save to database
        const savedOrder = await newScheduledOrder.save();

        console.log(
            `Order scheduled for ${scheduleDate.toISOString()} by ${
                user.name
            } (${user.userId})`
        );

        // Return the order with ID for frontend reference
        res.status(201).json({
            message: "Order scheduled successfully",
            id: savedOrder._id,
            scheduledOrder: savedOrder,
        });
    } catch (error) {
        console.error("Error scheduling order:", error);
        if ((error as Error).message.includes("authentication")) {
            res.status(401).json({
                error: "Authentication failed",
                details: (error as Error).message,
            });
        } else {
            res.status(500).json({
                error: "Failed to schedule order",
                details: (error as Error).message,
            });
        }
    }
});

// Get scheduled orders for current user
router.post("/myScheduledOrders", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        const orders = await ScheduleOrder.find({
            userId: user.userId,
        }).sort({ scheduledTime: -1 });

        res.json(orders);
    } catch (error) {
        console.error("Error fetching scheduled orders:", error);
        if ((error as Error).message.includes("authentication")) {
            res.status(401).json({
                error: "Authentication failed",
                details: (error as Error).message,
            });
        } else {
            res.status(500).json({ error: "Failed to fetch scheduled orders" });
        }
    }
});

// Get a specific scheduled order by ID
router.post(
    "/getScheduledOrder/:orderId",
    async (req: Request, res: Response) => {
        try {
            // Authenticate user first
            const user = await authenticateUser(req);

            const order = await ScheduleOrder.findOne({
                _id: req.params.orderId,
                userId: user.userId, // Ensure user can only access their own orders
            });

            if (!order) {
                res.status(404).json({ error: "Scheduled order not found" });
                return;
            }

            res.json(order);
        } catch (error) {
            console.error("Error fetching scheduled order:", error);
            if ((error as Error).message.includes("authentication")) {
                res.status(401).json({
                    error: "Authentication failed",
                    details: (error as Error).message,
                });
            } else {
                res.status(500).json({
                    error: "Failed to fetch scheduled order",
                });
            }
        }
    }
);

// Cancel a scheduled order
router.post(
    "/cancelScheduledOrder/:orderId",
    async (req: Request, res: Response) => {
        try {
            // Authenticate user first
            const user = await authenticateUser(req);

            const scheduledOrder = await ScheduleOrder.findOne({
                _id: req.params.orderId,
                userId: user.userId,
            });

            if (!scheduledOrder) {
                res.status(404).json({ error: "Scheduled order not found" });
                return;
            }

            // Can only cancel orders that are still scheduled
            if (scheduledOrder.status !== "scheduled") {
                res.status(400).json({
                    error: `Cannot cancel order with status: ${scheduledOrder.status}`,
                });
                return;
            }

            // Update status to cancelled
            const updatedOrder = await ScheduleOrder.findByIdAndUpdate(
                req.params.orderId,
                {
                    status: "cancelled",
                    notes: `${
                        scheduledOrder.notes || ""
                    }\nCancelled by user at ${new Date().toISOString()}`,
                },
                { new: true }
            );

            res.json({
                message: "Scheduled order cancelled successfully",
                scheduledOrder: updatedOrder,
            });
        } catch (error) {
            console.error("Error cancelling scheduled order:", error);
            if ((error as Error).message.includes("authentication")) {
                res.status(401).json({
                    error: "Authentication failed",
                    details: (error as Error).message,
                });
            } else {
                res.status(500).json({
                    error: "Failed to cancel scheduled order",
                });
            }
        }
    }
);

export default router;
