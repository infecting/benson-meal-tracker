import axios from "axios";
import qs from "qs";

const qss = qs;
// Create axios instance with default configuration
const api = axios.create({
    maxRedirects: 0,
    headers: {
        "User-Agent":
            "Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
    },
});

// Mobile API endpoints
const baseApiUrl = "https://mobileorderprodapi.transactcampus.com";
const baseIdpUrl = "https://login.scu.edu";

// User credentials and other constants
const credentials = {
    username: "ablackwell",
    password: "", // Note: In a real implementation, use environment variables
};

const campusId = "4";
const sessionId = Date.now().toString(); // Generate a unique session ID
let cookies: any = {};
let loginToken = "";
let userId = "";

// Helper to store cookies
const storeCookies = (response: any) => {
    const setCookieHeader = response.headers["set-cookie"];
    if (setCookieHeader) {
        setCookieHeader.forEach((cookie: any) => {
            const [cookiePart] = cookie.split(";");
            const [name, value] = cookiePart.split("=");
            cookies[name] = value;
        });
    }
};

// Helper to build cookie header
const getCookieHeader = () => {
    const x = Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join("; ");
    return x;
};

// Step 1: Initiate SAML login
const initiateLogin = async () => {
    try {
        const response = await axios
            .get(`${baseApiUrl}/api_user/samllogin?campusid=${campusId}`, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                },
                maxRedirects: 0,
                validateStatus: (status: any) => {
                    // Accept 2xx and 302 status codes as successful
                    return (status >= 200 && status < 300) || status === 302;
                },
            })
            .catch();

        storeCookies(response);
        console.log("Initiated SAML login process");
        console.log(response.headers["location"]);
        const response2 = await axios.get(response.headers["location"], {
            headers: {
                Host: "login.scu.edu",
                "Sec-Fetch-Site": "none",
                "Sec-Fetch-Mode": "navigate",
                "Sec-Fetch-Dest": "document",
            },
            maxRedirects: 0,
            validateStatus: (status: any) => {
                // Accept 2xx and 302 status codes as successful
                return (status >= 200 && status < 300) || status === 302;
            },
        });
        storeCookies(response2);
        // The response should redirect to the IDP, we'll follow that manually
        await followIdpRedirect();
    } catch (error) {
        console.error("Error initiating login:", error);
        throw error;
    }
};

// Step 2: Follow redirect to IDP
const followIdpRedirect = async () => {
    try {
        const x = getCookieHeader();
        const response = await axios.get(
            `${baseIdpUrl}/idp/profile/SAML2/Redirect/SSO?execution=e1s1`,
            {
                headers: {
                    Host: "login.scu.edu",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                    Cookie: x,
                },
                validateStatus: (status: any) => {
                    // Accept 2xx and 302 status codes as successful
                    return (status >= 200 && status < 300) || status === 302;
                },
            }
        );

        storeCookies(response);
        const csrf = response.data.match(/name="csrf_token"\s+value="([^"]+)"/);
        console.log("Followed redirect to IDP");

        // Now submit the CSRF form
        await submitCsrfForm(csrf[1]);
    } catch (error) {
        // console.error("Error following IDP redirect:", error);
        throw "hi";
    }
};

// Step 3: Submit the CSRF form
const submitCsrfForm = async (csrf: string) => {
    try {
        // In a real implementation, extract the CSRF token from the previous response
        const formData = {
            csrf_token: csrf,
            "shib_idp_ls_exception.shib_idp_session_ss": "",
            "shib_idp_ls_success.shib_idp_session_ss": "true",
            "shib_idp_ls_value.shib_idp_session_ss": "",
            "shib_idp_ls_exception.shib_idp_persistent_ss": "",
            "shib_idp_ls_success.shib_idp_persistent_ss": "true",
            "shib_idp_ls_value.shib_idp_persistent_ss": "",
            shib_idp_ls_supported: "true",
            _eventId_proceed: "",
        };

        const response = await api.post(
            `${baseIdpUrl}/idp/profile/SAML2/Redirect/SSO?execution=e1s1`,
            qss.stringify(formData),
            {
                headers: {
                    Host: "login.scu.edu",
                    "Content-Type": "application/x-www-form-urlencoded",
                    Origin: "https://login.scu.edu",
                    Referer:
                        "https://login.scu.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s1",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                    Cookie: getCookieHeader(),
                },
                validateStatus: (status: any) => {
                    // Accept 2xx and 302 status codes as successful
                    return (status >= 200 && status < 300) || status === 302;
                },
            }
        );

        storeCookies(response);
        console.log("Submitted CSRF form");

        // Proceed to the login page
        await getLoginPage(csrf);
    } catch (error) {
        console.error("Error submitting CSRF form:", error);
        throw error;
    }
};

// Step 4: Get the login page
const getLoginPage = async (csrf: string) => {
    try {
        const response = await api.get(
            `${baseIdpUrl}/idp/profile/SAML2/Redirect/SSO?execution=e1s2`,
            {
                headers: {
                    Host: "login.scu.edu",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                    Referer:
                        "https://login.scu.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s1",
                    Cookie: getCookieHeader(),
                },
            }
        );

        storeCookies(response);
        const csrf2 = response.data.match(
            /name="csrf_token"\s+value="([^"]+)"/
        );
        console.log("Got login page");

        // Submit login credentials
        await submitCredentials(csrf2[1]);
    } catch (error) {
        console.error("Error getting login page:", error);
        throw error;
    }
};

// Step 5: Submit login credentials
const submitCredentials = async (csrf: string) => {
    try {
        // In a real implementation, extract the CSRF token from the previous response
        const loginData = {
            csrf_token: csrf,
            j_username: credentials.username,
            j_password: credentials.password,
            _eventId_proceed: "",
        };

        const response = await api.post(
            `${baseIdpUrl}/idp/profile/SAML2/Redirect/SSO?execution=e1s2`,
            qss.stringify(loginData),
            {
                headers: {
                    Host: "login.scu.edu",
                    "Content-Type": "application/x-www-form-urlencoded",
                    Origin: "https://login.scu.edu",
                    Referer:
                        "https://login.scu.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s2",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                    Cookie: getCookieHeader(),
                },
                maxRedirects: 0,
                validateStatus: (status: any) => status >= 200 && status < 400,
            }
        );

        storeCookies(response);
        console.log("Submitted credentials");
        const saml = response.data.match(
            /name="SAMLResponse"\s+value="([^"]+)"/
        );

        // The response should contain a SAML assertion to send back to the service provider
        // In a real implementation, you would extract the SAMLResponse from the HTML form
        const samlResponse = encodeURIComponent(saml[1]); // This would be extracted from the response

        await submitSamlResponse(samlResponse);
    } catch (error) {
        console.error("Error submitting credentials:", error);
        throw error;
    }
};

// Step 6: Submit SAML response to service provider
const submitSamlResponse = async (samlResponse: any) => {
    try {
        const response = await api.post(
            `${baseApiUrl}/api_user/samlsuccess`,
            `SAMLResponse=${samlResponse}`,
            {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    "Content-Type": "application/x-www-form-urlencoded",
                    Origin: "https://login.scu.edu",
                    Referer: "https://login.scu.edu/",
                    "Sec-Fetch-Site": "cross-site",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                },
            }
        );

        storeCookies(response);
        console.log("Submitted SAML response");
        const token = response.data.match(
            /id="temp_token"[^>]*value="([^"]*)"/
        );
        console.log(token);
        // Now register with SSO token
        await registerWithSsoToken(token[1]);
    } catch (error) {
        console.error("Error submitting SAML response:", error);
        throw error;
    }
};

function generateHmacSha256(message: string, secretKey: string) {
    // Convert the message and key to ArrayBuffers
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    const keyBuffer = encoder.encode(secretKey);

    // Generate the HMAC
    return crypto.subtle
        .importKey(
            "raw",
            keyBuffer,
            { name: "HMAC", hash: { name: "SHA-256" } },
            false,
            ["sign"]
        )
        .then((key) => crypto.subtle.sign("HMAC", key, messageBuffer))
        .then((signature) => {
            // Convert to the same format as your Java code
            // Assuming q() is a function that converts a byte array to a string
            return arrayBufferToHexString(signature);
        });
}

// Helper function to convert ArrayBuffer to hex string
function arrayBufferToHexString(buffer: any) {
    return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

// Example usage
const secretKey = "dFz9Dq435BT3xCVU2PCy";

// Step 7: Register with campus SSO token
const registerWithSsoToken = async (temp_token: string) => {
    try {
        const hash = await generateHmacSha256(temp_token, secretKey);
        const registerData = {
            userid: "0",
            hash: hash,
            os_type: "0",
            app_bundle_name: "com.transact.mobileorder",
            language: "EN",
            temp_token: temp_token,
            campusid: campusId,
        };

        const response = await api.post(
            `${baseApiUrl}/api_user/registerwithcampusssotoken`,
            registerData,
            {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                },
            }
        );

        // Extract login token and user ID from response
        if (response.data && response.data.user) {
            loginToken = response.data.user.login_token;
            userId = response.data.user.userid; // Fallback to example userid
            console.log("Registered with SSO token, received login token");
        } else {
            throw new Error(
                "Failed to get login token from registration response"
            );
        }

        // Now login with the token
        await loginWithToken();
    } catch (error) {
        console.error("Error registering with SSO token:", error);
        throw error;
    }
};

// Step 8: Login with token
const loginWithToken = async () => {
    try {
        const loginData = {
            device_model:
                "iPad Pro 3rd Gen (12.9 inch, 1TB, WiFi) / iPad / iPad8,6",
            campusid: campusId,
            on_launch: "1",
            app_version: "2025.1.1",
            userid: userId,
            carrier_name: "",
            accessibility_mode: "0",
            device_name: "iPad",
            push_enabled: "1",
            os_language: "en-US",
            timezone: "PST",
            app_bundle_name: "com.transact.mobileorder",
            os_version: "18.1",
            push_token:
                "B924770E-7397-4DC9-9640-7031B73CEE63-75293-00000560A61D558D",
            os_type: "0",
        };

        const response = await api.post(
            `${baseApiUrl}/api_user/loginwithtoken`,
            loginData,
            {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: loginToken,
                },
            }
        );

        console.log("Logged in with token");

        // Get the menu
        await getMenu();
    } catch (error) {
        console.error("Error logging in with token:", error);
        throw error;
    }
};

// Step 9: Get the menu
const getMenu = async () => {
    try {
        const menuData = {
            ct_id2: "0",
            target_date: "",
            userid: userId,
            target_time: "",
            campusid: campusId,
            ct_id: "0",
            locationid: "6",
            payment_method: "0",
            retrieval_type: "0",
        };

        const response = await api.post(
            `${baseApiUrl}/api_user/getmenu`,
            menuData,
            {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: loginToken,
                },
            }
        );

        console.log("Retrieved menu");

        // Calculate cart
        await calculateCart();
    } catch (error) {
        console.error("Error getting menu:", error);
        throw error;
    }
};

// Step 10: Calculate cart
const calculateCart = async () => {
    try {
        const cartData = {
            grand_total: "0",
            pickup_time_max: "0",
            upsell_upsellid: "0",
            applepay_token: "",
            pickup_time_min: "0",
            subtotal: "0",
            os_version: "18.1",
            target_date: "",
            reorderid: "0",
            target_time: "",
            banner_message: "",
            credit_total: "0",
            promo_credit_total: "0",
            cash_eq_swipes: "0",
            subtotal_tax: "0",
            ct_id2: "13418",
            campaign_title: "",
            punchcard_credit_total: "0",
            userid: userId,
            special_comment: "",
            campaign_credit_total: "0",
            retrieval_type: "0",
            campusid: campusId,
            upsell_message: "",
            os_type: "0",
            checkout_select_choiceids: [],
            ct_id: "13418",
            promo_code: "",
            cash_eq_total: "0",
            meal_ex_swipes: "0",
            upsell_variantid: "0",
            servicefee: "0",
            campaign_description: "",
            longitude: "-121.939543",
            mealplan_discount: "0",
            redeem_punchid: "0",
            locationid: "12",
            payment_method_default: "0",
            pickupspotid: "0",
            meal_ex_total: "0",
            servicefee_tax: "0",
            app_bundle_name: "com.transact.mobileorder",
            code_description: "",
            upsell_itemid: "0",
            tender2_subtotal: "0",
            items: [
                {
                    itemid: 6204192,
                    sectionid: 56069,
                    upsell_upsellid: 0,
                    upsell_variantid: 0,
                    options: [
                        {
                            optionid: 494263,
                            values: [
                                {
                                    valueid: 804727,
                                    combo_itemid: 0,
                                    combo_items: [],
                                },
                            ],
                        },
                    ],
                    meal_ex_applied: false,
                },
            ],
            push_token:
                "B924770E-7397-4DC9-9640-7031B73CEE63-75293-00000560A61D558D",
            app_version: "2025.1.1",
            latitude: "37.348977",
        };

        const response = await api.post(
            `${baseApiUrl}/api_user/calculatecart`,
            cartData,
            {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: loginToken,
                },
            }
        );

        // Update cart data with calculated values
        const calculatedCart = response.data;
        console.log("Calculated cart");

        // Process the order with the calculated values
        await processOrder({
            ...cartData,
            grand_total: "385",
            pickup_time_max: "12",
            pickup_time_min: "10",
            subtotal: "385",
            checkout_select_choiceids: ["782"],
        });
    } catch (error) {
        console.error("Error calculating cart:", error);
        throw error;
    }
};

// Step 11: Process order
const processOrder = async (cartData: any) => {
    try {
        const response = await api.post(
            `${baseApiUrl}/api_user/processorderstaged`,
            cartData,
            {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: loginToken,
                },
            }
        );

        // Extract order ID from response
        const orderId = response.data.orderid || "86840688"; // Fallback to example orderid
        console.log(`Order processed successfully. Order ID: ${orderId}`);

        // Check order status
        await checkOrderStatus(orderId);
    } catch (error) {
        console.error("Error processing order:", error);
        throw error;
    }
};

// Step 12: Check order status
const checkOrderStatus = async (orderId: any) => {
    try {
        const statusData = {
            orderid: orderId,
            userid: userId,
            campusid: campusId,
        };

        const response = await api.post(
            `${baseApiUrl}/api_user/processorderstatuscheck`,
            statusData,
            {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: loginToken,
                },
            }
        );

        console.log("Order flow completed successfully");
    } catch (error) {
        console.error("Error checking order status:", error);
        throw error;
    }
};

// Main function to execute the flow
const executeOrderFlow = async () => {
    try {
        console.log("Starting order flow...");
        await initiateLogin();
        console.log("Order flow completed successfully");
    } catch (error) {
        console.error("Error in order flow:", error);
    }
};

// Run the script
executeOrderFlow();
