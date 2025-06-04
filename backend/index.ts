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
            cartItem: {
                // Store complete cart item structure
                itemid: Number,
                sectionid: Number,
                upsell_upsellid: Number,
                upsell_variantid: Number,
                options: [
                    {
                        optionid: Number,
                        values: [
                            {
                                valueid: Number,
                                combo_itemid: Number,
                                combo_items: [mongoose.Schema.Types.Mixed],
                            },
                        ],
                    },
                ],
                meal_ex_applied: Boolean,
            },
            options: [
                {
                    name: String,
                    value: String,
                    optId: Number,
                    valueId: Number,
                },
            ],
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
    barcode: { type: String },
    orderId: { type: String },
    fulfilledBy: { type: String },
    fulfilledByEmail: { type: String },
    fulfilledAt: { type: Date },
    // Store complete item details for fulfillment
    itemDetails: {
        id: Number,
        sectionid: Number,
        name: String,
        price: Number,
        cartItem: {
            itemid: Number,
            sectionid: Number,
            upsell_upsellid: Number,
            upsell_variantid: Number,
            options: [
                {
                    optionid: Number,
                    values: [
                        {
                            valueid: Number,
                            combo_itemid: Number,
                            combo_items: [mongoose.Schema.Types.Mixed],
                        },
                    ],
                },
            ],
            meal_ex_applied: Boolean,
        },
    },
    selectedOptions: [
        {
            name: String,
            value: String,
            optId: Number,
            valueId: Number,
            price: Number,
        },
    ],
    fulfillmentDetails: {
        // Store all order details for tracking
        actualOrderId: String,
        barcode: String,
        itemDetails: {
            itemid: Number,
            name: String,
            price: Number,
            sectionid: Number,
        },
        cartItems: [mongoose.Schema.Types.Mixed],
        orderTotal: Number,
        locationId: String,
        specialComment: String,
        calculatedCartData: mongoose.Schema.Types.Mixed,
    },
    comments: [
        {
            userId: String,
            userEmail: String,
            text: String,
            createdAt: { type: Date, default: Date.now },
        },
    ],
});

// Order schema without orderDetails
const orderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userEmail: { type: String, required: true },
    orderId: { type: String, required: true, unique: true }, // The actual order ID from mobile order API
    locationId: { type: String, required: true },
    locationName: { type: String },
    status: { type: String, required: true }, // pending, received, preparing, completed, cancelled, timeout, error
    barcode: { type: String },
    items: [
        {
            itemid: Number,
            sectionid: Number,
            name: String,
            price: Number,
            quantity: { type: Number, default: 1 },
            options: [
                {
                    optionid: Number,
                    values: [
                        {
                            valueid: Number,
                            combo_itemid: Number,
                            combo_items: [mongoose.Schema.Types.Mixed],
                        },
                    ],
                },
            ],
            meal_ex_applied: Boolean,
        },
    ],
    orderTotal: { type: Number, required: true }, // Total in cents
    specialComment: { type: String },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
});

// Create models
const User = mongoose.model("User", userSchema);
const ScheduleOrder = mongoose.model("ScheduleOrder", scheduleOrderSchema);
const RequestItem = mongoose.model("RequestItem", requestItemSchema);
const Order = mongoose.model("Order", orderSchema);

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
            itemDetails,
            selectedOptions,
        } = req.body;

        if (!itemName || !description) {
            res.status(400).json({
                error:
                    "Missing required fields: itemName and description are required",
            });
            return;
        }

        // Create the item request with complete item details
        const newRequestItem = new RequestItem({
            userId: user.userId,
            userEmail: user.email || userEmail,
            itemName,
            locationId: locationId || null,
            locationName: locationName || null,
            description,
            itemDetails: itemDetails || null,
            selectedOptions: selectedOptions || [],
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

// Updated fulfill request route with order status polling for barcode
app.post("/fulfillRequest", async (req: Request, res: Response) => {
    try {
        // Authenticate the fulfiller
        const fulfiller = await authenticateUser(req);

        const {
            requestId,
            requesterEmail,
            fulfillerId,
            fulfillerEmail,
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

        // Use stored cart item data if available, otherwise create default
        let cartItems;

        if (itemRequest.itemDetails && itemRequest.itemDetails.cartItem) {
            // Use the stored cart item with selected options
            cartItems = [itemRequest.itemDetails.cartItem];

            // Update options if selectedOptions are stored
            if (
                itemRequest.selectedOptions &&
                itemRequest.selectedOptions.length > 0
            ) {
                cartItems[0].options = itemRequest.selectedOptions.map(
                    (option: any) => ({
                        optionid: option.optId,
                        values: [
                            {
                                valueid: option.valueId,
                                combo_itemid: 0,
                                combo_items: [],
                            },
                        ],
                    })
                );
            }
        } else {
            // Fallback: try to find the item in the menu
            const menuResponse = await client.getMenuForLocation(
                itemRequest.locationId || "13"
            );

            let foundItem = null;
            if (menuResponse && menuResponse.sections) {
                for (const section of menuResponse.sections) {
                    if (section.items) {
                        foundItem = section.items.find(
                            (item: any) =>
                                item.name
                                    .toLowerCase()
                                    .includes(
                                        itemRequest.itemName.toLowerCase()
                                    ) ||
                                itemRequest.itemName
                                    .toLowerCase()
                                    .includes(item.name.toLowerCase())
                        );
                        if (foundItem) {
                            foundItem.sectionid = section.sectionid;
                            break;
                        }
                    }
                }
            }

            if (foundItem) {
                cartItems = [
                    {
                        itemid: foundItem.itemid,
                        sectionid: foundItem.sectionid,
                        upsell_upsellid: 0,
                        upsell_variantid: 0,
                        options: [],
                        meal_ex_applied: false,
                    },
                ];
            } else {
                // Last resort fallback
                cartItems = [
                    {
                        itemid: 1,
                        sectionid: 1,
                        upsell_upsellid: 0,
                        upsell_variantid: 0,
                        options: [],
                        meal_ex_applied: false,
                    },
                ];
            }
        }

        // Calculate the cart
        const calculatedCart = await client.calculateCart(
            cartItems,
            itemRequest.locationId || "13"
        );

        // Get the calculated total from the response
        const calculatedTotal =
            calculatedCart.calculatedData?.grand_total || 500;

        // Prepare order with special comment about fulfilling request
        const orderCart = {
            ...calculatedCart.cartData,
            grand_total: calculatedTotal,
            pickup_time_max: "12",
            pickup_time_min: "10",
            subtotal: calculatedTotal,
            checkout_select_choiceids: ["782"],
            special_comment: `Fulfilling request for ${
                requesterEmail || itemRequest.userEmail
            }: ${itemRequest.description}${
                specialRequest ? ` | Additional notes: ${specialRequest}` : ""
            }`,
        };

        // Process the order
        const orderResponse = await client.processOrder(orderCart);

        // Extract order ID from response
        let orderId = "";
        if (typeof orderResponse === "string") {
            orderId = orderResponse;
        } else if (orderResponse && orderResponse.orderid) {
            orderId = orderResponse.orderid;
        } else {
            throw new Error("Failed to process order - no order ID returned");
        }

        console.log(
            `Order ${orderId} processed, polling for status and barcode...`
        );

        // Poll for order status to get the barcode_token
        let barcode = "";
        let pollAttempts = 0;
        const maxPollAttempts = 10; // Maximum number of polling attempts
        const pollInterval = 2000; // 2 seconds between attempts

        while (pollAttempts < maxPollAttempts && !barcode) {
            try {
                await new Promise((resolve) =>
                    setTimeout(resolve, pollInterval)
                );

                const orderStatus = await client.checkOrderStatus(orderId);
                console.log(
                    `Poll attempt ${pollAttempts + 1}: Order status:`,
                    orderStatus
                );

                // Check if barcode_token is available
                if (orderStatus && orderStatus.barcode_token) {
                    barcode = orderStatus.barcode_token;
                    console.log(`Barcode received: ${barcode}`);
                    break;
                }

                pollAttempts++;
            } catch (pollError) {
                console.error(
                    `Error polling order status (attempt ${pollAttempts + 1}):`,
                    pollError
                );
                pollAttempts++;
            }
        }

        // If no barcode from polling, generate a fallback one
        if (!barcode) {
            console.log(
                "No barcode received from polling, generating fallback"
            );
            barcode = generateBarcode(orderId);
        }

        // Store all the order details for fulfillment tracking
        const fulfillmentDetails = {
            actualOrderId: orderId,
            barcode: barcode,
            itemDetails: itemRequest.itemDetails || null,
            cartItems: cartItems,
            orderTotal: calculatedTotal,
            locationId: itemRequest.locationId || "13",
            specialComment: orderCart.special_comment,
            calculatedCartData: calculatedCart.calculatedData,
            pollAttempts: pollAttempts,
            barcodeSource:
                barcode === generateBarcode(orderId) ? "generated" : "api",
        };

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
                fulfillmentDetails: fulfillmentDetails,
            },
            { new: true }
        );

        console.log(
            `Request ${requestId} fulfilled by ${fulfiller.name} (${fulfiller.userId}) with order ${orderId} and barcode ${barcode}`
        );

        res.status(200).json({
            success: true,
            message: "Request fulfilled successfully",
            orderId: orderId,
            barcode: barcode,
            requestId: requestId,
            fulfilledRequest: updatedRequest,
            orderDetails: fulfillmentDetails,
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
        const pastOrders = await Order.find();
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

// Updated /order endpoint with MongoDB integration - removed orderDetails
app.post("/order", async (req: Request, res: Response) => {
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

        // Calculate cart
        const calculatedCart = await client.calculateCart(
            req.body.cartItems,
            req.body.locationId
        );

        // Prepare order cart
        const orderCart = {
            ...calculatedCart.cartData,
            grand_total: req.body.total, // 385 for 3.85 etc
            pickup_time_max: "12",
            pickup_time_min: "10",
            subtotal: req.body.total, // 385 for 3.85 etc
            checkout_select_choiceids: ["782"],
        };

        // Add special request if provided
        if (req.body.specialRequest && req.body.specialRequest.trim()) {
            orderCart.special_comment = req.body.specialRequest.trim();
        }

        // Process the order
        const orderResponse = await client.processOrder(orderCart);

        // Extract order ID from response
        let orderId = orderResponse;

        console.log(`Order ${orderId} processed, creating database record...`);

        // Create initial order record in MongoDB - without orderDetails
        const newOrder = new Order({
            userId: user.userId,
            userEmail: user.email || `${user.name}@scu.edu`,
            orderId: orderId,
            locationId: req.body.locationId,
            locationName: "Restaurant", // You can get this from location mapping
            status: "pending",
            items: req.body.cartItems.map((item: any) => ({
                ...item,
                name: item.name || "Unknown Item", // Add item name if available
                price: req.body.total, // You might want to calculate individual item prices
            })),
            orderTotal: req.body.total,
            specialComment: req.body.specialRequest || "",
        });

        const savedOrder = await newOrder.save();
        console.log(
            `Order record created in database with ID: ${savedOrder._id}`
        );

        // Poll for order status until completion
        let finalStatus = null;
        let barcode = "";
        let pollAttempts = 0;
        const maxPollAttempts = 30; // Maximum number of polling attempts (5 minutes)
        const pollInterval = 10000; // 10 seconds between attempts

        while (pollAttempts < maxPollAttempts && !finalStatus) {
            try {
                // Wait before polling (except for first attempt)
                if (pollAttempts > 0) {
                    await new Promise((resolve) =>
                        setTimeout(resolve, pollInterval)
                    );
                }

                const orderStatus = await client.checkOrderStatus(orderId);
                console.log(
                    `Poll attempt ${pollAttempts + 1}: Order status:`,
                    orderStatus
                );

                // Check for barcode if available
                if (orderStatus && orderStatus.barcode_token && !barcode) {
                    barcode = orderStatus.barcode_token;
                    console.log(`Barcode received: ${barcode}`);
                }

                // Check if order is in a final state
                // The API returns order data in orderStatus.order
                const order = orderStatus.order;
                let currentStatus = "pending";

                if (order) {
                    // Check for completion using barcode token as primary indicator
                    const hasBarcode =
                        order.barcode_token &&
                        order.barcode_token.trim() !== "";
                    const isCancelled = order.iscancelled === 1;

                    if (hasBarcode && !isCancelled) {
                        currentStatus = "completed";
                    } else if (isCancelled) {
                        currentStatus = "cancelled";
                    } else if (
                        order.kitchen_datetime &&
                        order.kitchen_datetime.trim() !== ""
                    ) {
                        currentStatus = "preparing";
                    } else if (
                        order.printed_datetime &&
                        order.printed_datetime.trim() !== ""
                    ) {
                        currentStatus = "received";
                    } else {
                        currentStatus = "pending";
                    }

                    console.log(
                        `Order ${orderId} status determined: ${currentStatus} (barcode_token: ${
                            hasBarcode ? "present" : "none"
                        }, iscancelled: ${order.iscancelled})`
                    );

                    // Handle completed orders (when barcode is available)
                    if (hasBarcode && !isCancelled) {
                        // Update order as completed
                        await Order.findByIdAndUpdate(savedOrder._id, {
                            status: "completed",
                            barcode: order.barcode_token,
                            completedAt: new Date(),
                        });

                        finalStatus = {
                            orderId: orderId,
                            status: "completed",
                            barcode: order.barcode_token,
                            message: `Order completed with barcode: ${order.barcode_token}`,
                            orderDetails: orderStatus,
                            databaseId: savedOrder._id,
                        };
                        break;
                    }

                    // Handle cancelled orders
                    if (isCancelled) {
                        // Update order as cancelled
                        await Order.findByIdAndUpdate(savedOrder._id, {
                            status: "cancelled",
                            completedAt: new Date(),
                        });

                        console.error(`Order ${orderId} was cancelled`);
                        res.status(400).json({
                            error: "Order cancelled",
                            details: "Order was cancelled",
                            orderId: orderId,
                            status: "cancelled",
                            orderDetails: orderStatus,
                            databaseId: savedOrder._id,
                        });
                    }

                    // Order is still in progress
                    console.log(
                        `Order ${orderId} is still in progress: ${currentStatus}`
                    );
                } else {
                    // Fallback to checking top-level status if order object not available
                    if (orderStatus && orderStatus.status) {
                        currentStatus = orderStatus.status.toLowerCase();
                        console.log(
                            `Order ${orderId} fallback status: ${currentStatus}`
                        );
                    }
                }

                // Update order status in database
                await Order.findByIdAndUpdate(savedOrder._id, {
                    status: currentStatus,
                    ...(barcode && { barcode: barcode }),
                });

                pollAttempts++;
            } catch (pollError) {
                console.error(
                    `Error polling order status (attempt ${pollAttempts + 1}):`,
                    pollError
                );
                pollAttempts++;

                // If we've had multiple polling errors, consider it a failure
                if (pollAttempts >= 5) {
                    await Order.findByIdAndUpdate(savedOrder._id, {
                        status: "error",
                        completedAt: new Date(),
                    });

                    console.error(
                        `Too many polling errors for order ${orderId}`
                    );
                    res.status(400).json({
                        error: "Order processing error",
                        details: "Failed to verify order completion",
                        orderId: orderId,
                        databaseId: savedOrder._id,
                    });
                }
            }
        }

        // If we exit the loop without a final status, it means we timed out
        if (!finalStatus) {
            await Order.findByIdAndUpdate(savedOrder._id, {
                status: "timeout",
                completedAt: new Date(),
            });

            console.error(
                `Order ${orderId} polling timed out after ${maxPollAttempts} attempts`
            );
            res.status(400).json({
                error: "Order timeout",
                details: "Order processing took too long to complete",
                orderId: orderId,
                pollAttempts: pollAttempts,
                databaseId: savedOrder._id,
            });
        }

        // Return successful order completion
        res.json(finalStatus);
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

// Add the yourOrders endpoint
app.post("/yourOrders", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        const orders = await Order.find().sort({ createdAt: -1 });

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
app.post("/myOrders", async (req: Request, res: Response) => {
    try {
        // Authenticate user first
        const user = await authenticateUser(req);

        const orders = await Order.find().sort({ createdAt: -1 });

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
app.post("/getOrder/:orderId", async (req: Request, res: Response) => {
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
app.post("/getOrderByOrderId/:orderId", async (req: Request, res: Response) => {
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
});

// Update order status manually (for admin or debugging)
app.post("/updateOrderStatus/:orderId", async (req: Request, res: Response) => {
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
            res.status(500).json({ error: "Failed to update order status" });
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
