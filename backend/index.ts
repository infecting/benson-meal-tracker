import express, { Express, Request, Response } from "express";
import cors from "cors";

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

// Use API routes
app.get("/api", async (req, res) => {
    res.json("Hi");
});

// Import connectDB (uncomment when ready to use a database)
// import connectDB from './config/database';

// Start server
app.listen(port, () => {
    // Connect to database (uncomment when ready to use a database)
    // connectDB();
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
