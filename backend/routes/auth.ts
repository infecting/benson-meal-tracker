import express, { Request, Response } from "express";
import { MobileOrderClient } from "../request";
import { User } from "../database/schemas";
import { authenticateUser } from "../middleware/auth";

const router = express.Router();

// Login endpoint
router.post("/login", async (req: Request, res: Response) => {
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

// Get user profile
router.post("/getUserProfile", async (req: Request, res: Response) => {
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
router.post("/logout", async (req: Request, res: Response) => {
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

export default router;
