import { Order } from "../database/schemas";
import { MobileOrderClient } from "../request";

// Helper to generate barcode from order ID
export const generateBarcode = (orderId: string): string => {
    // Simple barcode generation - you can make this more sophisticated
    // This creates a barcode-friendly string from the order ID
    const timestamp = Date.now().toString().slice(-6);
    const orderDigits = orderId.replace(/\D/g, "").slice(-4) || "0000";
    return `SCU${orderDigits}${timestamp}`;
};

// Unified order processing function
export const processOrder = async (
    user: any,
    cartItems: any[],
    locationId: string,
    total: number,
    specialRequest?: string,
    orderType: string = "direct",
    relatedId?: string
): Promise<{
    orderId: string;
    status: string;
    barcode?: string;
    message: string;
    orderDetails?: any;
    databaseId: string;
}> => {
    // Create mobile order client
    let client = new MobileOrderClient(
        {
            baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
            baseIdpUrl: "https://login.scu.edu",
            campusId: "4",
            secretKey: "dFz9Dq435BT3xCVU2PCy",
        },
        {
            userId: user.userId,
            loginToken: user.loginToken,
            sessionId: user.sessionId,
        }
    );

    // Calculate cart
    const calculatedCart = await client.calculateCart(cartItems, locationId);

    // Prepare order cart
    const orderCart = {
        ...calculatedCart.cartData,
        grand_total: total,
        pickup_time_max: "12",
        pickup_time_min: "10",
        subtotal: total,
        checkout_select_choiceids: ["782"],
    };

    // Add special request if provided
    if (specialRequest && specialRequest.trim()) {
        orderCart.special_comment = specialRequest.trim();
    }

    // Process the order
    const orderResponse = await client.processOrder(orderCart);

    // Extract order ID from response
    let orderId = orderResponse;

    console.log(`Order ${orderId} processed, creating database record...`);

    // Create initial order record in MongoDB
    const newOrder = new Order({
        userId: user.userId,
        userEmail: user.email || `${user.name}@scu.edu`,
        orderId: orderId,
        locationId: locationId,
        locationName: "Restaurant", // You can get this from location mapping
        status: "pending",
        items: cartItems.map((item: any) => ({
            ...item,
            name: item.name || "Unknown Item",
            price: total, // You might want to calculate individual item prices
        })),
        orderTotal: total,
        specialComment: specialRequest || "",
        orderType: orderType,
        relatedId: relatedId,
    });

    const savedOrder = await newOrder.save();
    console.log(`Order record created in database with ID: ${savedOrder._id}`);

    // Poll for order status until completion
    let finalStatus: any = null;
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
            const order = orderStatus.order;
            let currentStatus = "pending";

            if (order) {
                // Check for completion using barcode token as primary indicator
                const hasBarcode =
                    order.barcode_token && order.barcode_token.trim() !== "";
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
                        databaseId: savedOrder._id.toString(),
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

                    throw new Error(`Order ${orderId} was cancelled`);
                }

                // Order is still in progress
                console.log(
                    `Order ${orderId} is still in progress: ${currentStatus}`
                );
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

                throw new Error(`Too many polling errors for order ${orderId}`);
            }
        }
    }

    // If we exit the loop without a final status, it means we timed out
    if (!finalStatus) {
        await Order.findByIdAndUpdate(savedOrder._id, {
            status: "timeout",
            completedAt: new Date(),
        });

        throw new Error(
            `Order ${orderId} polling timed out after ${maxPollAttempts} attempts`
        );
    }

    return finalStatus;
};
