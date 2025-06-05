import express, { Request, Response } from "express";
import { MobileOrderClient } from "../request";
import { authenticateUser } from "../middleware/auth";
import { processOrder } from "../services/orderProcessor";
import {
    cleanMenu,
    getLocationDistribution,
    getMostFrequentOrder,
    getMostFrequentPlace,
    getOrderDistributionByHour,
    moneySpent,
    getAverageOrderValue,
    getUniqueItems,
    getWeeklySpend,
    getOrderFrequency,
} from "../utils";
import { Order } from "../database/schemas";

const router = express.Router();

// Direct order endpoint using unified order logic
router.post("/order", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        const { cartItems, locationId, total, specialRequest } = req.body;

        if (!cartItems || !locationId || total === undefined) {
            res.status(400).json({
                error:
                    "Missing required fields: cartItems, locationId, and total are required",
            });
            return;
        }

        // Use unified order processing
        const result = await processOrder(
            user,
            cartItems,
            locationId,
            total,
            specialRequest,
            "direct"
        );

        // Return successful order completion
        res.json(result);
    } catch (error) {
        console.error("Error processing order:", error);

        if ((error as Error).message.includes("authentication")) {
            res.status(401).json({
                error: "Authentication failed",
                details: (error as Error).message,
            });
        } else if (
            (error as Error).message.includes("Failed to process order")
        ) {
            res.status(400).json({
                error: "Order processing failed",
                details: (error as Error).message,
            });
        } else if ((error as Error).message.includes("calculate")) {
            res.status(400).json({
                error: "Cart calculation failed",
                details: (error as Error).message,
            });
        } else {
            res.status(400).json({
                error: "Order failed",
                details: (error as Error).message,
            });
        }
    }
});

// Get past orders from API
router.post("/getPastOrders", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        let client = new MobileOrderClient(
            {
                baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
                baseIdpUrl: "https://login.scu.edu",
                campusId: "4",
                secretKey: "dFz9Dq435BT3xCVU2PCy",
            },
            {
                userId: req.body.userId,
                loginToken: req.body.loginToken,
                sessionId: req.body.sessionId,
            }
        );
        const pastOrders = await Order.find({
            userId: user.userId,
        });
        console.log(pastOrders);
        res.json(pastOrders);
    } catch (e) {
        console.log((e as Error).message);
        if ((e as Error).message.includes("authentication")) {
            res.status(401).json({ error: (e as Error).message });
        } else {
            res.json({ error: (e as Error).message });
        }
    }
});

// Get all orders (admin view)
router.post("/yourOrders", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        const orders = await Order.find({
            userId: user.userId,
        }).sort({ createdAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error("Error fetching your orders:", error);
        if ((error as Error).message.includes("authentication")) {
            res.status(401).json({
                error: "Authentication failed",
                details: (error as Error).message,
            });
        } else {
            res.status(500).json({ error: "Failed to fetch your orders" });
        }
    }
});

// Get user's order history
router.post("/myOrders", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        const orders = await Order.find({ userId: user.userId }).sort({
            createdAt: -1,
        });

        res.json(orders);
    } catch (error) {
        console.error("Error fetching user orders:", error);
        if ((error as Error).message.includes("authentication")) {
            res.status(401).json({
                error: "Authentication failed",
                details: (error as Error).message,
            });
        } else {
            res.status(500).json({ error: "Failed to fetch orders" });
        }
    }
});

// Get a specific order by database ID
router.post("/getOrder/:orderId", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        const order = await Order.findOne({
            _id: req.params.orderId,
            userId: user.userId, // Ensure user can only access their own orders
        });

        if (!order) {
            res.status(404).json({ error: "Order not found" });
            return;
        }

        res.json(order);
    } catch (error) {
        console.error("Error fetching order:", error);
        if ((error as Error).message.includes("authentication")) {
            res.status(401).json({
                error: "Authentication failed",
                details: (error as Error).message,
            });
        } else {
            res.status(500).json({ error: "Failed to fetch order" });
        }
    }
});

// Get order by mobile order API order ID
router.post(
    "/getOrderByOrderId/:orderId",
    async (req: Request, res: Response) => {
        try {
            // Authenticate user first
            const user = await authenticateUser(req);

            const order = await Order.findOne({
                orderId: req.params.orderId,
                userId: user.userId, // Ensure user can only access their own orders
            });

            if (!order) {
                res.status(404).json({ error: "Order not found" });
                return;
            }

            res.json(order);
        } catch (error) {
            console.error("Error fetching order by order ID:", error);
            if ((error as Error).message.includes("authentication")) {
                res.status(401).json({
                    error: "Authentication failed",
                    details: (error as Error).message,
                });
            } else {
                res.status(500).json({ error: "Failed to fetch order" });
            }
        }
    }
);

// Update order status manually (for admin or debugging)
router.post(
    "/updateOrderStatus/:orderId",
    async (req: Request, res: Response) => {
        try {
            // Authenticate user first
            const user = await authenticateUser(req);

            const { status, barcode } = req.body;

            if (!status) {
                res.status(400).json({ error: "Status is required" });
                return;
            }

            const order = await Order.findOneAndUpdate(
                {
                    _id: req.params.orderId,
                    userId: user.userId,
                },
                {
                    status: status,
                    ...(barcode && { barcode: barcode }),
                    ...([
                        "completed",
                        "ready",
                        "picked_up",
                        "delivered",
                        "cancelled",
                        "failed",
                        "error",
                    ].includes(status.toLowerCase()) && {
                        completedAt: new Date(),
                    }),
                },
                { new: true }
            );

            if (!order) {
                res.status(404).json({ error: "Order not found" });
                return;
            }

            res.json({
                message: "Order status updated successfully",
                order: order,
            });
        } catch (error) {
            console.error("Error updating order status:", error);
            if ((error as Error).message.includes("authentication")) {
                res.status(401).json({
                    error: "Authentication failed",
                    details: (error as Error).message,
                });
            } else {
                res.status(500).json({
                    error: "Failed to update order status",
                });
            }
        }
    }
);

// Check order status
router.post("/orderStatus", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        await authenticateUser(req);

        let client = new MobileOrderClient(
            {
                baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
                baseIdpUrl: "https://login.scu.edu",
                campusId: "4",
                secretKey: "dFz9Dq435BT3xCVU2PCy",
            },
            {
                userId: req.body.userId,
                loginToken: req.body.loginToken,
                sessionId: req.body.sessionId,
            }
        );
        // some kind of polling
        const r = await client.checkOrderStatus(req.body.orderId);
        res.json(r);
    } catch (e) {
        console.error(e);
        if ((e as Error).message.includes("authentication")) {
            res.status(401).json({ error: (e as Error).message });
        } else {
            res.status(500).json({ error: "Failed to check order status" });
        }
    }
});

// Get wrapped/analytics data
router.post("/getWrapped", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        await authenticateUser(req);

        let client = new MobileOrderClient(
            {
                baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
                baseIdpUrl: "https://login.scu.edu",
                campusId: "4",
                secretKey: "dFz9Dq435BT3xCVU2PCy",
            },
            {
                userId: req.body.userId,
                loginToken: req.body.loginToken,
                sessionId: req.body.sessionId,
            }
        );
        const pastOrders = await client.getPastOrders();
        console.log(pastOrders);
        let frequentPlace = getMostFrequentPlace(pastOrders);
        let frequentOrder = getMostFrequentOrder(pastOrders);
        let money = moneySpent(pastOrders);
        let frequentHours = getOrderDistributionByHour(pastOrders);
        let placeDist = getLocationDistribution(pastOrders);
        let avgOrderValue = getAverageOrderValue(pastOrders);
        let uniqueItems = getUniqueItems(pastOrders);
        let orderFrequency = getOrderFrequency(pastOrders);
        res.json({
            place: frequentPlace.most,
            placeDist: placeDist,
            order: frequentOrder,
            money: money / 100,
            hours: frequentHours,
            avgOrderValue: avgOrderValue / 100,
            uniqueItems: uniqueItems,
            orderFrequency: orderFrequency
        });
    } catch (e) {
        console.log((e as Error).message);
        if ((e as Error).message.includes("authentication")) {
            res.status(401).json({ error: (e as Error).message });
        } else {
            res.json({ error: (e as Error).message });
        }
    }
});

// Get menu
router.post("/getMenu", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        await authenticateUser(req);

        let client = new MobileOrderClient(
            {
                baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
                baseIdpUrl: "https://login.scu.edu",
                campusId: "4",
                secretKey: "dFz9Dq435BT3xCVU2PCy",
            },
            {
                userId: req.body.userId,
                loginToken: req.body.loginToken,
                sessionId: req.body.sessionId,
            }
        );
        const menuResponse = await client.getMenuForLocation("" + req.query.l);
        console.log(menuResponse);
        const finalMenu = cleanMenu(menuResponse);
        res.json(finalMenu);
    } catch (e) {
        console.log((e as Error).message);
        if ((e as Error).message.includes("authentication")) {
            res.status(401).json({ error: (e as Error).message });
        } else {
            res.json({ error: (e as Error).message });
        }
    }
});

export default router;
