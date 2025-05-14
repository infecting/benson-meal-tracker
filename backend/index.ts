import express, { Express, Request, Response } from "express";
import cors from "cors";
import { MobileOrderClient } from "./request";
import { auth, requiresAuth } from "express-openid-connect";
import dotenv from "dotenv";
import {
    cleanMenu,
    getMostFrequentOrder,
    getMostFrequentPlace,
    getOrderDistributionByHour,
    moneySpent,
} from "./utils";
dotenv.config();

// Load environment variables

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple root route
app.get("/", (req: Request, res: Response) => {
    res.send("Express + TypeScript Server is running");
});

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

// Home route
app.get("/", (req, res) => {
    res.send(
        req.oidc.isAuthenticated()
            ? `Logged in as ${req.oidc.user?.name} <a href="/logout">Logout</a>`
            : `Not logged in. <a href="/login">Login</a>`
    );
});

// Protected route
app.get("/profile", requiresAuth(), (req, res) => {
    res.send(`<pre>${JSON.stringify(req.oidc.user, null, 2)}</pre>`);
});

// Use API routes
app.post("/mobileOrder/login", async (req, res) => {
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
        console.log(e.message);
        res.json({ error: e.message });
    }
});

app.post("/getPastOrders", async (req, res) => {
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
        console.log(e.message);
        res.json({ error: e.message });
    }
});

app.post("/order", async (req, res) => {
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
    }
});

app.post("/orderStatus", async (req, res) => {
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
    }
});

app.post("/getWrapped", async (req, res) => {
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
        res.json({
            place: frequentPlace,
            order: frequentOrder,
            money: money / 100,
            hours: frequentHours,
        });
    } catch (e) {
        console.log(e.message);
        res.json({ error: e.message });
    }
});

app.post("/getMenu", async (req, res) => {
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
        console.log(e.message);
        res.json({ error: e.message });
    }
});

// Import connectDB (uncomment when ready to use a database)
// import connectDB from './config/database';

// Start server
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
