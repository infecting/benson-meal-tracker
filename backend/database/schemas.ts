import mongoose from "mongoose";

// User Schema
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

// Scheduled Order Schema
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
    cartItems: [mongoose.Schema.Types.Mixed], // Raw cart items for ordering
    total: { type: Number, required: true }, // Total price in cents
    specialRequest: { type: String },
    scheduledTime: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: "scheduled" }, // scheduled, processing, completed, cancelled, failed
    notes: { type: String },
    actualOrderId: { type: String }, // Set when order is placed
    barcode: { type: String }, // Set when order is completed
    processedAt: { type: Date }, // When the scheduled order was actually processed
    completedAt: { type: Date }, // When the order was completed
});

// Request Item Schema
const requestItemSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userEmail: { type: String, required: true },
    itemName: { type: String, required: true },
    locationId: { type: String },
    locationName: { type: String },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: "pending" }, // pending, approved, rejected, fulfilled
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
});

// Order Schema
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
    orderType: { type: String, default: "direct" }, // direct, scheduled, fulfillment
    relatedId: { type: String }, // ID of related scheduled order or item request
});

// Create and export models
export const User = mongoose.model("User", userSchema);
export const ScheduleOrder = mongoose.model(
    "ScheduleOrder",
    scheduleOrderSchema
);
export const RequestItem = mongoose.model("RequestItem", requestItemSchema);
export const Order = mongoose.model("Order", orderSchema);
