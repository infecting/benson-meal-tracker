import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import { MobileOrderClient } from "./request";
import { auth, requiresAuth } from "express-openid-connect";
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
    status: { type: String, default: "pending" }, // pending, approved, rejected
    upvotes: { type: Number, default: 0 },
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
const ScheduleOrder = mongoose.model("ScheduleOrder", scheduleOrderSchema);
const RequestItem = mongoose.model("RequestItem", requestItemSchema);

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.AUTH0_SECRET!,
    baseURL: process.env.AUTH0_BASE_URL!,
    clientID: process.env.AUTH0_CLIENT_ID!,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET!,
    authorizationParams: {
        response_type: "code",
        scope: "openid profile email",
        connection: "google-oauth2", // Only Allows Google login
    },
};

// Attach Auth0 routes
app.use(auth(config));

// Authentication check middleware - FIXED VERSION
const checkAuthentication = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!(req as any).oidc.isAuthenticated()) {
        res.status(401).json({ error: "Authentication required" });
        return; // Important: return here to prevent calling next()
    }
    next();
};

// Helper to validate SCU user token
const validateSCUToken = (req: Request): boolean => {
    return !!(req.body.userId && req.body.loginToken && req.body.sessionId);
};

// Home route
app.get("/", (req: Request, res: Response) => {
    const oidcReq = req as any; // Type assertion for oidc properties
    res.send(
        oidcReq.oidc.isAuthenticated()
            ? `Logged in as ${oidcReq.oidc.user?.name} <a href="/logout">Logout</a>`
            : `Not logged in. <a href="/login">Login</a>`
    );
});

// Protected route
app.get("/profile", requiresAuth(), (req: Request, res: Response) => {
    const oidcReq = req as any;
    res.send(`<pre>${JSON.stringify(oidcReq.oidc.user, null, 2)}</pre>`);
});

app.post(
    "/scheduleOrder",
    checkAuthentication,
    async (req: Request, res: Response) => {
        try {
            // Validate required fields
            const {
                locationId,
                locationName,
                items,
                scheduledTime,
                notes,
            } = req.body;

            if (!locationId || !items || !scheduledTime) {
                res.status(400).json({
                    error:
                        "Missing required fields: locationId, items, and scheduledTime are required",
                });
            }

            // Validate SCU credentials
            if (!validateSCUToken(req)) {
                res.status(400).json({
                    error: "SCU login credentials required",
                });
            }

            const oidcReq = req as any;

            // Create the schedule order
            const newScheduledOrder = new ScheduleOrder({
                userId: req.body.userId,
                userEmail: oidcReq.oidc.user.email,
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
            res.status(500).json({
                error: "Failed to schedule order",
                details: (error as Error).message,
            });
        }
    }
);

app.post(
    "/requestItem",
    checkAuthentication,
    async (req: Request, res: Response) => {
        try {
            // Validate required fields
            const {
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
            }

            // Validate SCU credentials
            if (!validateSCUToken(req)) {
                res.status(400).json({
                    error: "SCU login credentials required",
                });
            }

            const oidcReq = req as any;

            // Create the item request
            const newRequestItem = new RequestItem({
                userId: req.body.userId,
                userEmail: oidcReq.oidc.user.email,
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
            res.status(500).json({
                error: "Failed to submit item request",
                details: (error as Error).message,
            });
        }
    }
);

// Get scheduled orders for current user
app.get(
    "/myScheduledOrders",
    checkAuthentication,
    async (req: Request, res: Response) => {
        try {
            if (!validateSCUToken(req)) {
                res.status(400).json({
                    error: "SCU login credentials required",
                });
            }

            const orders = await ScheduleOrder.find({
                userId: req.body.userId,
            }).sort({ scheduledTime: -1 });

            res.json(orders);
        } catch (error) {
            console.error("Error fetching scheduled orders:", error);
            res.status(500).json({ error: "Failed to fetch scheduled orders" });
        }
    }
);

// Get item requests for current user
app.get(
    "/myItemRequests",
    checkAuthentication,
    async (req: Request, res: Response) => {
        try {
            if (!validateSCUToken(req)) {
                res.status(400).json({
                    error: "SCU login credentials required",
                });
            }

            const requests = await RequestItem.find({
                userId: req.body.userId,
            }).sort({ createdAt: -1 });

            res.json(requests);
        } catch (error) {
            console.error("Error fetching item requests:", error);
            res.status(500).json({ error: "Failed to fetch item requests" });
        }
    }
);

// Get all public item requests (for voting)
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
    checkAuthentication,
    async (req: Request, res: Response) => {
        try {
            const request = await RequestItem.findById(req.params.requestId);

            if (!request) {
                res.status(404).json({ error: "Item request not found" });
            }

            request.upvotes += 1;
            await request.save();

            res.json({
                message: "Upvote successful",
                upvotes: request.upvotes,
            });
        } catch (error) {
            console.error("Error upvoting request:", error);
            res.status(500).json({ error: "Failed to upvote request" });
        }
    }
);

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
        console.log(loginResp);
        res.json({ token: loginResp });
    } catch (e) {
        console.log((e as Error).message);
        res.json({ error: (e as Error).message });
    }
});

app.post("/getPastOrders", async (req: Request, res: Response) => {
    try {
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
        res.json({ error: (e as Error).message });
    }
});

app.post("/order", async (req: Request, res: Response) => {
    try {
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
        res.status(500).json({ error: "Failed to process order" });
    }
});

app.post("/orderStatus", async (req: Request, res: Response) => {
    try {
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
        res.status(500).json({ error: "Failed to check order status" });
    }
});

app.post("/getWrapped", async (req: Request, res: Response) => {
    try {
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
        res.json({ error: (e as Error).message });
    }
});

app.post("/getMenu", async (req: Request, res: Response) => {
    try {
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
        res.json({ error: (e as Error).message });
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
