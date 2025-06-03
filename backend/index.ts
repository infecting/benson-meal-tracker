import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { MobileOrderClient } from "./request";
import dotenv from "dotenv";
import mongoose from "mongoose";
import {
    cleanMenu,
    getLocationDistribution,
    getMostFrequentOrder,
    getMostFrequentPlace,
    getOrderDistributionByHour,
    moneySpent,
} from "./utils";
dotenv.config();

// MongoDB Connection
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI!);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
    }
};

// Define Schemas
const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    loginToken: { type: String, required: true },
    sessionId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
});

const scheduleOrderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userEmail: { type: String, required: true },
    locationId: { type: String, required: true },
    locationName: { type: String, required: true },
    items: [
        {
            itemId: String,
            name: String,
            price: Number,
            quantity: Number,
            options: [{ name: String, value: String }],
        },
    ],
    scheduledTime: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: "scheduled" }, // scheduled, processing, completed, cancelled
    notes: { type: String },
});

const requestItemSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userEmail: { type: String, required: true },
    itemName: { type: String, required: true },
    locationId: { type: String },
    locationName: { type: String },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: "pending" }, // pending, approved, rejected, fulfilled
    upvotes: { type: Number, default: 0 },
    barcode: { type: String }, // Add barcode field
    orderId: { type: String }, // Add order ID field
    fulfilledBy: { type: String }, // User ID who fulfilled the request
    fulfilledByEmail: { type: String }, // Email of user who fulfilled
    fulfilledAt: { type: Date }, // When it was fulfilled
    comments: [
        {
            userId: String,
            userEmail: String,
            text: String,
            createdAt: { type: Date, default: Date.now },
        },
    ],
});

// Create models
const User = mongoose.model("User", userSchema);
const ScheduleOrder = mongoose.model("ScheduleOrder", scheduleOrderSchema);
const RequestItem = mongoose.model("RequestItem", requestItemSchema);

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to validate and authenticate user token
const authenticateUser = async (req: Request): Promise<any> => {
    const { userId, loginToken, sessionId } = req.body;

    if (!userId || !loginToken || !sessionId) {
        throw new Error("Missing authentication credentials");
    }

    // Find user in database and verify token
    const user = await User.findOne({
        userId: userId,
        loginToken: loginToken,
        sessionId: sessionId,
        isActive: true,
    });

    if (!user) {
        throw new Error("Invalid or expired authentication token");
    }

    return user;
};

// Helper to validate user email
const validateUserEmail = (req: Request): boolean => {
    return !!(req.body.userEmail && req.body.userEmail.includes("@"));
};

// Helper to generate barcode from order ID
const generateBarcode = (orderId: string): string => {
    // Simple barcode generation - you can make this more sophisticated
    // This creates a barcode-friendly string from the order ID
    const timestamp = Date.now().toString().slice(-6);
    const orderDigits = orderId.replace(/\D/g, "").slice(-4) || "0000";
    return `SCU${orderDigits}${timestamp}`;
};

// Home route
app.get("/", (req: Request, res: Response) => {
    res.send("SCU Mobile Order API Server");
});

app.post("/mobileOrder/login", async (req: Request, res: Response) => {
    try {
        let client = new MobileOrderClient(
            { username: req.body.username, password: req.body.password },
            {
                baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
                baseIdpUrl: "https://login.scu.edu",
                campusId: "4",
                secretKey: "dFz9Dq435BT3xCVU2PCy",
            }
        );
        const loginResp = await client.login();
        console.log("Login response:", loginResp);

        // Store or update user in database
        const userData = {
            userId: loginResp.userId.toString(),
            loginToken: loginResp.loginToken,
            sessionId: loginResp.sessionId,
            name: loginResp.name,
            email: `${loginResp.name}@scu.edu`, // Assuming SCU email format
            lastLogin: new Date(),
            isActive: true,
        };

        // Use upsert to create or update user
        await User.findOneAndUpdate({ userId: userData.userId }, userData, {
            upsert: true,
            new: true,
        });

        console.log(
            `User ${userData.name} (${userData.userId}) logged in and stored in database`
        );

        res.json({ token: loginResp });
    } catch (e) {
        console.log((e as Error).message);
        res.status(400).json({ error: (e as Error).message });
    }
});

app.post("/scheduleOrder", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        // Validate required fields
        const {
            userEmail,
            locationId,
            locationName,
            items,
            scheduledTime,
            notes,
        } = req.body;

        if (!userEmail || !locationId || !items || !scheduledTime) {
            res.status(400).json({
                error:
                    "Missing required fields: userEmail, locationId, items, and scheduledTime are required",
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
            scheduledTime: new Date(scheduledTime),
            notes: notes || "",
        });

        // Save to database
        const savedOrder = await newScheduledOrder.save();

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

app.post("/requestItem", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        // Validate required fields
        const {
            userEmail,
            itemName,
            description,
            locationId,
            locationName,
        } = req.body;

        if (!itemName || !description) {
            res.status(400).json({
                error:
                    "Missing required fields: itemName and description are required",
            });
            return;
        }

        // Create the item request
        const newRequestItem = new RequestItem({
            userId: user.userId,
            userEmail: user.email || userEmail,
            itemName,
            locationId: locationId || null,
            locationName: locationName || null,
            description,
        });

        // Save to database
        const savedRequest = await newRequestItem.save();

        // Return the request with ID for frontend reference
        res.status(201).json({
            message: "Item request submitted successfully",
            id: savedRequest._id,
            itemRequest: savedRequest,
        });
    } catch (error) {
        console.error("Error requesting item:", error);
        if ((error as Error).message.includes("authentication")) {
            res.status(401).json({
                error: "Authentication failed",
                details: (error as Error).message,
            });
        } else {
            res.status(500).json({
                error: "Failed to submit item request",
                details: (error as Error).message,
            });
        }
    }
});

// NEW: Fulfill request route
app.post("/fulfillRequest", async (req: Request, res: Response) => {
    try {
        // Authenticate the fulfiller
        const fulfiller = await authenticateUser(req);

        const {
            requestId,
            requesterEmail,
            fulfillerId,
            fulfillerEmail,
            cartItems,
            locationId,
            total,
            specialRequest,
        } = req.body;

        if (!requestId) {
            res.status(400).json({
                error: "Missing required field: requestId",
            });
            return;
        }

        // Find the request to fulfill
        const itemRequest = await RequestItem.findById(requestId);
        if (!itemRequest) {
            res.status(404).json({
                error: "Request not found",
            });
            return;
        }

        // Check if request is already fulfilled
        if (itemRequest.status === "fulfilled") {
            res.status(400).json({
                error: "Request has already been fulfilled",
            });
            return;
        }

        // Check if user is trying to fulfill their own request
        if (itemRequest.userId === fulfiller.userId) {
            res.status(400).json({
                error: "You cannot fulfill your own request",
            });
            return;
        }

        // Create mobile order client for the fulfiller
        let client = new MobileOrderClient(
            {
                baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
                baseIdpUrl: "https://login.scu.edu",
                campusId: "4",
                secretKey: "dFz9Dq435BT3xCVU2PCy",
            },
            {
                userId: fulfiller.userId,
                loginToken: fulfiller.loginToken,
                sessionId: fulfiller.sessionId,
            }
        );

        // For now, we'll create a simplified order since we don't have exact menu item details
        // In a production system, you'd want to store more detailed item information in the request
        const defaultCartItems = cartItems || [
            {
                itemid: 1, // This would need to be mapped from the actual menu
                sectionid: 1,
                upsell_upsellid: 0,
                upsell_variantid: 0,
                options: [],
                meal_ex_applied: false,
            },
        ];

        // Calculate the cart
        const calculatedCart = await client.calculateCart(
            defaultCartItems,
            locationId || itemRequest.locationId || "13"
        );

        // Prepare order with special note about fulfilling request
        const orderCart = {
            ...calculatedCart.cartData,
            grand_total: total || 500, // Default to $5.00 if no total provided
            pickup_time_max: "12",
            pickup_time_min: "10",
            subtotal: total || 500,
            checkout_select_choiceids: ["782"],
            // Add special note that this is fulfilling a request
            special_instructions: `Fulfilling request for ${requesterEmail}: ${
                itemRequest.description
            }${specialRequest ? ` | Additional notes: ${specialRequest}` : ""}`,
        };

        // Process the order
        const orderId = await client.processOrder(orderCart);

        if (!orderId) {
            throw new Error("Failed to process order - no order ID returned");
        }

        // Generate barcode for the order
        const barcode = generateBarcode(orderId);

        // Update the request with fulfillment information
        const updatedRequest = await RequestItem.findByIdAndUpdate(
            requestId,
            {
                status: "fulfilled",
                orderId: orderId,
                barcode: barcode,
                fulfilledBy: fulfiller.userId,
                fulfilledByEmail: fulfiller.email || fulfillerEmail,
                fulfilledAt: new Date(),
            },
            { new: true }
        );

        console.log(
            `Request ${requestId} fulfilled by ${fulfiller.name} (${fulfiller.userId}) with order ${orderId}`
        );

        res.status(200).json({
            success: true,
            message: "Request fulfilled successfully",
            orderId: orderId,
            barcode: barcode,
            requestId: requestId,
            fulfilledRequest: updatedRequest,
        });
    } catch (error) {
        console.error("Error fulfilling request:", error);
        if ((error as Error).message.includes("authentication")) {
            res.status(401).json({
                error: "Authentication failed",
                details: (error as Error).message,
            });
        } else if ((error as Error).message.includes("order")) {
            res.status(400).json({
                error: "Failed to process order",
                details: (error as Error).message,
            });
        } else {
            res.status(500).json({
                error: "Failed to fulfill request",
                details: (error as Error).message,
            });
        }
    }
});

// Get scheduled orders for current user
app.post("/myScheduledOrders", async (req: Request, res: Response) => {
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

// Get item requests for current user
app.post("/myItemRequests", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        const requests = await RequestItem.find({
            userId: user.userId,
        }).sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error("Error fetching item requests:", error);
        if ((error as Error).message.includes("authentication")) {
            res.status(401).json({
                error: "Authentication failed",
                details: (error as Error).message,
            });
        } else {
            res.status(500).json({ error: "Failed to fetch item requests" });
        }
    }
});

// Get a specific scheduled order by ID
app.post("/getScheduledOrder/:orderId", async (req: Request, res: Response) => {
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
            res.status(500).json({ error: "Failed to fetch scheduled order" });
        }
    }
});

// Get a specific item request by ID
app.post("/getItemRequest/:requestId", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        const request = await RequestItem.findOne({
            _id: req.params.requestId,
            userId: user.userId, // Ensure user can only access their own requests
        });

        if (!request) {
            res.status(404).json({ error: "Item request not found" });
            return;
        }

        res.json(request);
    } catch (error) {
        console.error("Error fetching item request:", error);
        if ((error as Error).message.includes("authentication")) {
            res.status(401).json({
                error: "Authentication failed",
                details: (error as Error).message,
            });
        } else {
            res.status(500).json({ error: "Failed to fetch item request" });
        }
    }
});

// Get all public item requests (for voting) - no auth needed
app.get("/publicItemRequests", async (req: Request, res: Response) => {
    try {
        const requests = await RequestItem.find()
            .sort({ upvotes: -1, createdAt: -1 })
            .limit(50);

        res.json(requests);
    } catch (error) {
        console.error("Error fetching public item requests:", error);
        res.status(500).json({ error: "Failed to fetch public item requests" });
    }
});

// Upvote an item request
app.post(
    "/upvoteItemRequest/:requestId",
    async (req: Request, res: Response) => {
        try {
            // Authenticate user first
            const user = await authenticateUser(req);

            const request = await RequestItem.findById(req.params.requestId);

            if (!request) {
                res.status(404).json({ error: "Item request not found" });
                return;
            }

            request.upvotes += 1;
            await request.save();

            res.json({
                message: "Upvote successful",
                upvotes: request.upvotes,
            });
        } catch (error) {
            console.error("Error upvoting request:", error);
            if ((error as Error).message.includes("authentication")) {
                res.status(401).json({
                    error: "Authentication failed",
                    details: (error as Error).message,
                });
            } else {
                res.status(500).json({ error: "Failed to upvote request" });
            }
        }
    }
);

// Get user profile
app.post("/getUserProfile", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        // Return user data without sensitive info
        res.json({
            userId: user.userId,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        if ((error as Error).message.includes("authentication")) {
            res.status(401).json({
                error: "Authentication failed",
                details: (error as Error).message,
            });
        } else {
            res.status(500).json({ error: "Failed to fetch user profile" });
        }
    }
});

// Invalidate user session (logout)
app.post("/logout", async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            res.status(400).json({ error: "User ID is required" });
            return;
        }

        // Mark user as inactive or remove the session
        await User.findOneAndUpdate({ userId: userId }, { isActive: false });

        res.json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Error logging out:", error);
        res.status(500).json({ error: "Failed to logout" });
    }
});

app.post("/getPastOrders", async (req: Request, res: Response) => {
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

app.post("/order", async (req: Request, res: Response) => {
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
        const calculatedCart = await client.calculateCart(
            req.body.cartItems,
            req.body.locationId
        );
        const orderCart = {
            ...calculatedCart.cartData,
            grand_total: req.body.total, // 385 for 3.85 etc
            pickup_time_max: "12",
            pickup_time_min: "10",
            subtotal: req.body.total, // 385 for 3.85 etc
            checkout_select_choiceids: ["782"],
        };
        const orderId = await client.processOrder(orderCart);
        res.json({ orderId: orderId });
    } catch (e) {
        console.error(e);
        if ((e as Error).message.includes("authentication")) {
            res.status(401).json({ error: (e as Error).message });
        } else {
            res.status(500).json({ error: "Failed to process order" });
        }
    }
});

app.post("/orderStatus", async (req: Request, res: Response) => {
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

app.post("/getWrapped", async (req: Request, res: Response) => {
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
        res.json({
            place: frequentPlace.most,
            placeDist: placeDist,
            order: frequentOrder,
            money: money / 100,
            hours: frequentHours,
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

app.post("/getMenu", async (req: Request, res: Response) => {
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

// Connect to MongoDB and start server
const startServer = async () => {
    try {
        // Set MongoDB URI
        process.env.MONGODB_URI =
            process.env.MONGODB_URI ||
            "mongodb+srv://<db_username>:<db_password>@benson.0y9twrp.mongodb.net/?retryWrites=true&w=majority&appName=Benson";

        // Connect to MongoDB first
        await connectDB();

        // Then start Express server
        app.listen(port, () => {
            console.log(
                `⚡️[server]: Server is running at http://localhost:${port}`
            );
            console.log(`⚡️[server]: MongoDB connected`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
