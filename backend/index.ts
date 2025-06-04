import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import route modules
import authRoutes from "./routes/auth";
import orderRoutes from "./routes/orders";
import scheduledOrderRoutes from "./routes/scheduledOrders";
import requestItemRoutes from "./routes/requestItems";
import adminRoutes from "./routes/admin";
import { ScheduledOrderProcessor } from "./services/scheduleOrderProcessor";
import { connectDB } from "./database/connect";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create and start the scheduled order processor
const scheduledOrderProcessor = new ScheduledOrderProcessor();

// Home route
app.get("/", (req: Request, res: Response) => {
    res.send("SCU Mobile Order API Server");
});

// Mount route modules
app.use("/mobileOrder", authRoutes); // /mobileOrder/login
app.use("/", authRoutes); // /getUserProfile, /logout
app.use("/", orderRoutes); // /order, /myOrders, etc.
app.use("/", scheduledOrderRoutes); // /scheduleOrder, /myScheduledOrders, etc.
app.use("/", requestItemRoutes); // /requestItem, /fulfillRequest, etc.
app.use("/admin", adminRoutes); // /admin/schedulerStatus, etc.

// Enhanced admin route that has access to the scheduler
app.post(
    "/admin/triggerScheduledOrders",
    async (req: Request, res: Response) => {
        try {
            // Only allow this in development/testing
            if (process.env.NODE_ENV === "production") {
                res.status(403).json({ error: "Not allowed in production" });
                return;
            }

            // Manually trigger the processor
            await scheduledOrderProcessor.processScheduledOrders();

            res.json({
                message: "Scheduled order processing triggered manually",
            });
        } catch (error) {
            console.error("Error triggering scheduled orders:", error);
            res.status(500).json({
                error: "Failed to trigger scheduled order processing",
            });
        }
    }
);

// Enhanced scheduler status route
app.get("/admin/schedulerStatus", (req: Request, res: Response) => {
    res.json({
        isRunning: scheduledOrderProcessor ? true : false,
        message: "Scheduled order processor status",
        timestamp: new Date().toISOString(),
    });
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

        // Start the scheduled order processor
        scheduledOrderProcessor.start();

        // Then start Express server
        app.listen(port, () => {
            console.log(
                `⚡️[server]: Server is running at http://localhost:${port}`
            );
            console.log(`⚡️[server]: MongoDB connected`);
            console.log(`⚡️[server]: Scheduled order processor started`);
        });

        // Graceful shutdown
        process.on("SIGINT", () => {
            console.log("Received SIGINT, shutting down gracefully...");
            scheduledOrderProcessor.stop();
            process.exit(0);
        });

        process.on("SIGTERM", () => {
            console.log("Received SIGTERM, shutting down gracefully...");
            scheduledOrderProcessor.stop();
            process.exit(0);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
