// function generateHmacSha256(message, secretKey) {
//     // Convert the message and key to ArrayBuffers
//     const encoder = new TextEncoder();
//     const messageBuffer = encoder.encode(message);
//     const keyBuffer = encoder.encode(secretKey);

//     // Generate the HMAC
//     return crypto.subtle.importKey(
//         "raw",
//         keyBuffer,
//         { name: "HMAC", hash: { name: "SHA-256" } },
//         false,
//         ["sign"]
//     )
//         .then(key => crypto.subtle.sign(
//             "HMAC",
//             key,
//             messageBuffer
//         ))
//         .then(signature => {
//             // Convert to the same format as your Java code
//             // Assuming q() is a function that converts a byte array to a string
//             return arrayBufferToHexString(signature);
//         });
// }

// // Helper function to convert ArrayBuffer to hex string
// function arrayBufferToHexString(buffer) {
//     return Array.from(new Uint8Array(buffer))
//         .map(b => b.toString(16).padStart(2, '0'))
//         .join('');
// }

// // Example usage
// const secretKey = "dFz9Dq435BT3xCVU2PCy";
// const message = "439b0dc2a8fa05c8582d5fba41d9bd9ffb5ab3ed61367d36908096332a57052448bc739d1af865d905df0bb64d0eaed78f7799a0687eea68c4b952fae416aed3e";

// generateHmacSha256(message, secretKey)
//     .then(hash => console.log(hash));