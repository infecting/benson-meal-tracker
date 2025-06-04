import express, { Request, Response } from "express";
import { MobileOrderClient } from "../request";
import { authenticateUser } from "../middleware/auth";
import { processOrder } from "../services/orderProcessor";
import { RequestItem } from "../database/schemas";

const router = express.Router();

// Submit an item request
router.post("/requestItem", async (req: Request, res: Response) => {
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

// Fulfill an item request using unified order logic
router.post("/fulfillRequest", async (req: Request, res: Response) => {
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
        let estimatedTotal = 500; // Default fallback

        if (itemRequest.itemDetails && itemRequest.itemDetails.cartItem) {
            // Use the stored cart item with selected options
            cartItems = [itemRequest.itemDetails.cartItem];
            estimatedTotal = itemRequest.itemDetails.price || 500;

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
                            estimatedTotal = foundItem.price || 500;
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

        // Prepare special comment
        const specialComment = `Fulfilling request for ${
            requesterEmail || itemRequest.userEmail
        }: ${itemRequest.description}${
            specialRequest ? ` | Additional notes: ${specialRequest}` : ""
        }`;

        // Use unified order processing
        const result = await processOrder(
            fulfiller,
            cartItems,
            itemRequest.locationId || "13",
            estimatedTotal,
            specialComment,
            "fulfillment",
            itemRequest._id.toString()
        );

        // Update the request with fulfillment information
        const updatedRequest = await RequestItem.findByIdAndUpdate(
            requestId,
            {
                status: "fulfilled",
                orderId: result.orderId,
                barcode: result.barcode,
                fulfilledBy: fulfiller.userId,
                fulfilledByEmail: fulfiller.email || fulfillerEmail,
                fulfilledAt: new Date(),
                fulfillmentDetails: {
                    actualOrderId: result.orderId,
                    barcode: result.barcode,
                    itemDetails: itemRequest.itemDetails || null,
                    cartItems: cartItems,
                    orderTotal: estimatedTotal,
                    locationId: itemRequest.locationId || "13",
                    specialComment: specialComment,
                },
            },
            { new: true }
        );

        console.log(
            `Request ${requestId} fulfilled by ${fulfiller.name} (${fulfiller.userId}) with order ${result.orderId} and barcode ${result.barcode}`
        );

        res.status(200).json({
            success: true,
            message: "Request fulfilled successfully",
            orderId: result.orderId,
            barcode: result.barcode,
            requestId: requestId,
            fulfilledRequest: updatedRequest,
            orderDetails: result.orderDetails,
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

// Get item requests for current user
router.post("/myItemRequests", async (req: Request, res: Response) => {
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

// Get a specific item request by ID
router.post(
    "/getItemRequest/:requestId",
    async (req: Request, res: Response) => {
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
    }
);

// Get all public item requests (for voting) - no auth needed
router.get("/publicItemRequests", async (req: Request, res: Response) => {
    try {
        const requests = await RequestItem.find().limit(50);

        res.json(requests);
    } catch (error) {
        console.error("Error fetching public item requests:", error);
        res.status(500).json({ error: "Failed to fetch public item requests" });
    }
});

export default router;
