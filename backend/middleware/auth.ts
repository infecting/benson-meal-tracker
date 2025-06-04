import { Request } from "express";
import { User } from "../database/schemas";

// Helper to validate and authenticate user token
export const authenticateUser = async (req: Request): Promise<any> => {
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
export const validateUserEmail = (req: Request): boolean => {
    return !!(req.body.userEmail && req.body.userEmail.includes("@"));
};
