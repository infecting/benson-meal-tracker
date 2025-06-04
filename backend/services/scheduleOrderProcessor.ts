import { ScheduleOrder, User } from "../database/schemas";
import { processOrder } from "./orderProcessor";

// Background job system for scheduled orders
export class ScheduledOrderProcessor {
    private isRunning = false;
    private intervalId: NodeJS.Timeout | null = null;

    start() {
        if (this.isRunning) {
            console.log("Scheduled order processor is already running");
            return;
        }

        this.isRunning = true;
        console.log("Starting scheduled order processor...");

        // Check every minute for orders to process
        this.intervalId = setInterval(async () => {
            await this.processScheduledOrders();
        }, 60000); // 1 minute interval

        // Also run immediately on start
        this.processScheduledOrders();
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        console.log("Scheduled order processor stopped");
    }

    async processScheduledOrders() {
        try {
            const now = new Date();
            const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000); // 5 minutes buffer

            // Find orders that are scheduled to be processed
            const scheduledOrders = await ScheduleOrder.find({
                status: "scheduled",
                scheduledTime: {
                    $lte: fiveMinutesFromNow, // Process orders within 5 minutes of scheduled time
                },
            });

            console.log(
                `Found ${scheduledOrders.length} scheduled orders to process`
            );

            for (const scheduledOrder of scheduledOrders) {
                try {
                    // Mark as processing to prevent duplicate processing
                    await ScheduleOrder.findByIdAndUpdate(scheduledOrder._id, {
                        status: "processing",
                        processedAt: new Date(),
                    });

                    console.log(
                        `Processing scheduled order ${scheduledOrder._id}`
                    );

                    // Get user credentials
                    const user = await User.findOne({
                        userId: scheduledOrder.userId,
                        isActive: true,
                    });

                    if (!user) {
                        console.error(
                            `User not found for scheduled order ${scheduledOrder._id}`
                        );
                        await ScheduleOrder.findByIdAndUpdate(
                            scheduledOrder._id,
                            {
                                status: "failed",
                                notes: `${
                                    scheduledOrder.notes || ""
                                }\nFailed: User not found or inactive`,
                            }
                        );
                        continue;
                    }

                    // Process the order using unified order logic
                    const result = await processOrder(
                        user,
                        scheduledOrder.cartItems,
                        scheduledOrder.locationId,
                        scheduledOrder.total,
                        scheduledOrder.specialRequest,
                        "scheduled",
                        scheduledOrder._id.toString()
                    );

                    // Update scheduled order with results
                    await ScheduleOrder.findByIdAndUpdate(scheduledOrder._id, {
                        status: "completed",
                        actualOrderId: result.orderId,
                        barcode: result.barcode,
                        completedAt: new Date(),
                    });

                    console.log(
                        `Scheduled order ${scheduledOrder._id} completed with order ID ${result.orderId}`
                    );
                } catch (error) {
                    console.error(
                        `Error processing scheduled order ${scheduledOrder._id}:`,
                        error
                    );

                    // Mark as failed
                    await ScheduleOrder.findByIdAndUpdate(scheduledOrder._id, {
                        status: "failed",
                        notes: `${scheduledOrder.notes || ""}\nFailed: ${
                            (error as Error).message
                        }`,
                    });
                }
            }
        } catch (error) {
            console.error("Error in scheduled order processor:", error);
        }
    }
}
