import axios, { AxiosInstance, AxiosResponse } from "axios";
import qs from "qs";

// Configuration
interface Credentials {
    username: string;
    password: string;
}

interface ApiConfig {
    baseApiUrl: string;
    baseIdpUrl: string;
    campusId: string;
    secretKey: string;
}

interface SessionState {
    sessionId: string;
    cookies: Record<string, string>;
    loginToken: string;
    userId: string;
}

interface TokenConfig {
    userId: string;
    loginToken: string;
    sessionId?: string;
}

export class MobileOrderClient {
    private api: AxiosInstance;
    private config: ApiConfig;
    private credentials?: Credentials;
    private state: SessionState;

    constructor(
        credentialsOrConfig: Credentials | ApiConfig,
        configOrToken: ApiConfig | TokenConfig
    ) {
        if ("username" in credentialsOrConfig) {
            // First constructor: with credentials
            this.credentials = credentialsOrConfig;
            this.config = configOrToken as ApiConfig;
            this.state = {
                sessionId: Date.now().toString(),
                cookies: {},
                loginToken: "",
                userId: "",
            };
        } else {
            // Second constructor: with token
            this.config = credentialsOrConfig;
            const tokenConfig = configOrToken as TokenConfig;
            this.state = {
                sessionId: tokenConfig.sessionId || Date.now().toString(),
                cookies: {},
                loginToken: tokenConfig.loginToken,
                userId: tokenConfig.userId,
            };
        }

        // Create axios instance with default configuration
        this.api = axios.create({
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
    }

    // Cookie Management
    private storeCookies(response: AxiosResponse): void {
        const setCookieHeader = response.headers["set-cookie"];
        if (setCookieHeader) {
            setCookieHeader.forEach((cookie: string) => {
                const [cookiePart] = cookie.split(";");
                const [name, value] = cookiePart.split("=");
                this.state.cookies[name] = value;
            });
        }
    }

    private getCookieHeader(): string {
        return Object.entries(this.state.cookies)
            .map(([name, value]) => `${name}=${value}`)
            .join("; ");
    }

    // HMAC Generation
    private async generateHmacSha256(
        message: string,
        secretKey: string
    ): Promise<string> {
        // Convert the message and key to ArrayBuffers
        const encoder = new TextEncoder();
        const messageBuffer = encoder.encode(message);
        const keyBuffer = encoder.encode(secretKey);

        // Generate the HMAC
        const key = await crypto.subtle.importKey(
            "raw",
            keyBuffer,
            { name: "HMAC", hash: { name: "SHA-256" } },
            false,
            ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", key, messageBuffer);
        return this.arrayBufferToHexString(signature);
    }

    private arrayBufferToHexString(buffer: ArrayBuffer): string {
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    // Authentication Steps
    public async login() {
        try {
            if (!this.credentials) {
                throw new Error(
                    "Cannot login: No credentials provided. This client was initialized with a token."
                );
            }
            await this.initiateLogin();
            return {
                userId: this.state.userId,
                sessionId: this.state.sessionId,
                loginToken: this.state.loginToken,
            };
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    }

    private async initiateLogin(): Promise<void> {
        try {
            const url = `${this.config.baseApiUrl}/api_user/samllogin?campusid=${this.config.campusId}`;
            const response = await axios.get(url, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                },
                maxRedirects: 0,
                validateStatus: (status) =>
                    (status >= 200 && status < 300) || status === 302,
            });

            this.storeCookies(response);
            console.log("Initiated SAML login process");

            // Follow redirect to IDP
            return await this.followInitialRedirect(
                response.headers["location"]
            );
        } catch (error) {
            console.error("Error initiating login:", error);
            throw error;
        }
    }

    private async followInitialRedirect(redirectUrl: string): Promise<void> {
        try {
            const response = await axios.get(redirectUrl, {
                headers: {
                    Host: "login.scu.edu",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                },
                maxRedirects: 0,
                validateStatus: (status) =>
                    (status >= 200 && status < 300) || status === 302,
            });

            this.storeCookies(response);
            return await this.followIdpRedirect();
        } catch (error) {
            console.error("Error following initial redirect:", error);
            throw error;
        }
    }

    private async followIdpRedirect(): Promise<void> {
        try {
            const url = `${this.config.baseIdpUrl}/idp/profile/SAML2/Redirect/SSO?execution=e1s1`;
            const response = await axios.get(url, {
                headers: {
                    Host: "login.scu.edu",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                    Cookie: this.getCookieHeader(),
                },
                validateStatus: (status) =>
                    (status >= 200 && status < 300) || status === 302,
            });

            this.storeCookies(response);
            console.log("Followed redirect to IDP");

            // Extract CSRF token from response
            const csrfMatch = response.data.match(
                /name="csrf_token"\s+value="([^"]+)"/
            );
            if (!csrfMatch || !csrfMatch[1]) {
                throw new Error("Failed to extract CSRF token");
            }

            return await this.submitCsrfForm(csrfMatch[1]);
        } catch (error) {
            console.error("Error following IDP redirect:", error);
            throw error;
        }
    }

    private async submitCsrfForm(csrf: string): Promise<void> {
        try {
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

            const url = `${this.config.baseIdpUrl}/idp/profile/SAML2/Redirect/SSO?execution=e1s1`;
            const response = await this.api.post(url, qs.stringify(formData), {
                headers: {
                    Host: "login.scu.edu",
                    "Content-Type": "application/x-www-form-urlencoded",
                    Origin: "https://login.scu.edu",
                    Referer:
                        "https://login.scu.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s1",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                    Cookie: this.getCookieHeader(),
                },
                validateStatus: (status) =>
                    (status >= 200 && status < 300) || status === 302,
            });

            this.storeCookies(response);
            console.log("Submitted CSRF form");

            return await this.getLoginPage(csrf);
        } catch (error) {
            console.error("Error submitting CSRF form:", error);
            throw error;
        }
    }

    private async getLoginPage(previousCsrf: string): Promise<void> {
        try {
            const url = `${this.config.baseIdpUrl}/idp/profile/SAML2/Redirect/SSO?execution=e1s2`;
            const response = await this.api.get(url, {
                headers: {
                    Host: "login.scu.edu",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                    Referer:
                        "https://login.scu.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s1",
                    Cookie: this.getCookieHeader(),
                },
            });

            this.storeCookies(response);
            console.log("Got login page");

            // Extract new CSRF token
            const csrfMatch = response.data.match(
                /name="csrf_token"\s+value="([^"]+)"/
            );
            if (!csrfMatch || !csrfMatch[1]) {
                throw new Error("Failed to extract CSRF token from login page");
            }

            return await this.submitCredentials(csrfMatch[1]);
        } catch (error) {
            console.error("Error getting login page:", error);
            throw error;
        }
    }

    private async submitCredentials(csrf: string): Promise<void> {
        try {
            if (!this.credentials) {
                throw new Error(
                    "Cannot submit credentials: No credentials provided."
                );
            }

            const loginData = {
                csrf_token: csrf,
                j_username: this.credentials.username,
                j_password: this.credentials.password,
                _eventId_proceed: "",
            };

            const url = `${this.config.baseIdpUrl}/idp/profile/SAML2/Redirect/SSO?execution=e1s2`;
            const response = await this.api.post(url, qs.stringify(loginData), {
                headers: {
                    Host: "login.scu.edu",
                    "Content-Type": "application/x-www-form-urlencoded",
                    Origin: "https://login.scu.edu",
                    Referer:
                        "https://login.scu.edu/idp/profile/SAML2/Redirect/SSO?execution=e1s2",
                    "Sec-Fetch-Site": "same-origin",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Dest": "document",
                    Cookie: this.getCookieHeader(),
                },
                maxRedirects: 0,
                validateStatus: (status) => status >= 200 && status < 400,
            });

            this.storeCookies(response);
            console.log("Submitted credentials");

            // Extract SAML response
            const samlMatch = response.data.match(
                /name="SAMLResponse"\s+value="([^"]+)"/
            );
            if (!samlMatch || !samlMatch[1]) {
                throw new Error("Failed to extract SAML response");
            }

            const samlResponse = encodeURIComponent(samlMatch[1]);
            return await this.submitSamlResponse(samlResponse);
        } catch (error) {
            console.error("Error submitting credentials:", error);
            throw error;
        }
    }

    private async submitSamlResponse(samlResponse: string): Promise<void> {
        try {
            const url = `${this.config.baseApiUrl}/api_user/samlsuccess`;
            const response = await this.api.post(
                url,
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

            this.storeCookies(response);
            console.log("Submitted SAML response");

            // Extract token
            const tokenMatch = response.data.match(
                /id="temp_token"[^>]*value="([^"]*)"/
            );
            if (!tokenMatch || !tokenMatch[1]) {
                throw new Error("Failed to extract temporary token");
            }

            return await this.registerWithSsoToken(tokenMatch[1]);
        } catch (error) {
            console.error("Error submitting SAML response:", error);
            throw error;
        }
    }

    private async registerWithSsoToken(tempToken: string): Promise<void> {
        try {
            const hash = await this.generateHmacSha256(
                tempToken,
                this.config.secretKey
            );
            const registerData = {
                userid: "0",
                hash: hash,
                os_type: "0",
                app_bundle_name: "com.transact.mobileorder",
                language: "EN",
                temp_token: tempToken,
                campusid: this.config.campusId,
            };

            const url = `${this.config.baseApiUrl}/api_user/registerwithcampusssotoken`;
            const response = await this.api.post(url, registerData, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: this.state.sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                },
            });

            // Extract login token and user ID
            if (response.data && response.data.user) {
                this.state.loginToken = response.data.user.login_token;
                this.state.userId = response.data.user.userid;
                console.log("Registered with SSO token, received login token");
            } else {
                throw new Error(
                    "Failed to get login token from registration response"
                );
            }

            return await this.loginWithToken();
        } catch (error) {
            console.error("Error registering with SSO token:", error);
            throw error;
        }
    }

    private async loginWithToken(): Promise<void> {
        try {
            const loginData = {
                device_model:
                    "iPad Pro 3rd Gen (12.9 inch, 1TB, WiFi) / iPad / iPad8,6",
                campusid: this.config.campusId,
                on_launch: "1",
                app_version: "2025.1.1",
                userid: this.state.userId,
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

            const url = `${this.config.baseApiUrl}/api_user/loginwithtoken`;
            const response = await this.api.post(url, loginData, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: this.state.sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: this.state.loginToken,
                },
            });

            console.log("Logged in with token");
            return response.data;
        } catch (error) {
            console.error("Error logging in with token:", error);
            throw error;
        }
    }

    // Menu and Order Processing
    public async getMenuForLocation(locationId: string): Promise<any> {
        try {
            const menuData = {
                ct_id2: "0",
                target_date: "",
                userid: this.state.userId,
                target_time: "",
                campusid: this.config.campusId,
                ct_id: "0",
                locationid: locationId,
                payment_method: "0",
                retrieval_type: "0",
            };

            const url = `${this.config.baseApiUrl}/api_user/getmenu`;
            const response = await this.api.post(url, menuData, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: this.state.sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: this.state.loginToken,
                },
            });

            console.log("Retrieved menu for location", locationId);
            return response.data;
        } catch (error) {
            console.error("Error getting menu:", error);
            throw error;
        }
    }

    public async calculateCart(
        cartItems: any[],
        locationId: string
    ): Promise<any> {
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
                userid: this.state.userId,
                special_comment: "",
                campaign_credit_total: "0",
                retrieval_type: "0",
                campusid: this.config.campusId,
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
                locationid: locationId,
                payment_method_default: "0",
                pickupspotid: "0",
                meal_ex_total: "0",
                servicefee_tax: "0",
                app_bundle_name: "com.transact.mobileorder",
                code_description: "",
                upsell_itemid: "0",
                tender2_subtotal: "0",
                items: cartItems,
                push_token:
                    "B924770E-7397-4DC9-9640-7031B73CEE63-75293-00000560A61D558D",
                app_version: "2025.1.1",
                latitude: "37.348977",
            };

            const url = `${this.config.baseApiUrl}/api_user/calculatecart`;
            const response = await this.api.post(url, cartData, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: this.state.sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: this.state.loginToken,
                },
            });

            console.log("Calculated cart");
            return {
                calculatedData: response.data,
                cartData: cartData,
            };
        } catch (error) {
            console.error("Error calculating cart:", error);
            throw error;
        }
    }

    public async processOrder(calculatedCart: any): Promise<string> {
        try {
            const url = `${this.config.baseApiUrl}/api_user/processorderstaged`;
            const response = await this.api.post(url, calculatedCart, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: this.state.sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: this.state.loginToken,
                },
            });

            const orderId = response.data.orderid || "";
            console.log(`Order processed successfully. Order ID: ${orderId}`);
            return orderId;
        } catch (error) {
            console.error("Error processing order:", error);
            throw error;
        }
    }

    public async checkOrderStatus(orderId: string): Promise<any> {
        try {
            const statusData = {
                orderid: orderId,
                userid: this.state.userId,
                campusid: this.config.campusId,
            };

            const url = `${this.config.baseApiUrl}/api_user/processorderstatuscheck`;
            const response = await this.api.post(url, statusData, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: this.state.sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: this.state.loginToken,
                },
            });

            console.log("Checked order status");
            return response.data;
        } catch (error) {
            console.error("Error checking order status:", error);
            throw error;
        }
    }
    
    //public async rateOrder()...

    // Utility Methods
    public async getLocations(): Promise<any> {
        try {
            const locationData = {
                userid: this.state.userId,
                campusid: this.config.campusId,
            };

            const url = `${this.config.baseApiUrl}/api_user/getlocations`;
            const response = await this.api.post(url, locationData, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: this.state.sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: this.state.loginToken,
                },
            });

            console.log("Retrieved locations");
            return response.data;
        } catch (error) {
            console.error("Error getting locations:", error);
            throw error;
        }
    }

    public async getUserPaymentMethods(): Promise<any> {
        try {
            const paymentData = {
                userid: this.state.userId,
                campusid: this.config.campusId,
            };

            const url = `${this.config.baseApiUrl}/api_user/getuserpaymentmethods`;
            const response = await this.api.post(url, paymentData, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: this.state.sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: this.state.loginToken,
                },
            });

            console.log("Retrieved payment methods");
            return response.data;
        } catch (error) {
            console.error("Error getting payment methods:", error);
            throw error;
        }
    }

    public async getOrderHistory(): Promise<any> {
        try {
            const historyData = {
                userid: this.state.userId,
                campusid: this.config.campusId,
            };

            const url = `${this.config.baseApiUrl}/api_user/getorderhistory`;
            const response = await this.api.post(url, historyData, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: this.state.sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    login_token: this.state.loginToken,
                },
            });

            console.log("Retrieved order history");
            return response.data;
        } catch (error) {
            console.error("Error getting order history:", error);
            throw error;
        }
    }

    public async getPastOrders(): Promise<any> {
        try {
            const pastOrdersData = {
                userid: this.state.userId,
                campusid: this.config.campusId,
            };

            const url = `${this.config.baseApiUrl}/api_user/getpastorders`;
            const response = await this.api.post(url, pastOrdersData, {
                headers: {
                    Host: "mobileorderprodapi.transactcampus.com",
                    sessionid: this.state.sessionId,
                    "Content-Type": "application/json",
                    "User-Agent":
                        "Transact%20Prod/58 CFNetwork/1568.200.51 Darwin/24.1.0",
                    Connection: "keep-alive",
                    Accept: "*/*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                    login_token: this.state.loginToken,
                },
            });

            console.log("Retrieved past orders");
            return response.data;
        } catch (error) {
            console.error("Error getting past orders:", error);
            throw error;
        }
    }
}

// Usage example
async function main() {
    const credentials: Credentials = {
        username: "ablackwell",
        password: "x",
    };

    const config: ApiConfig = {
        baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
        baseIdpUrl: "https://login.scu.edu",
        campusId: "4",
        secretKey: "dFz9Dq435BT3xCVU2PCy",
    };

    const client = new MobileOrderClient(credentials, config);

    try {
        // Login flow
        await client.login();

        // Get locations
        const locations = await client.getLocations();
        console.log("Available locations:", locations);

        // Get menu for a specific location
        const menu = await client.getMenuForLocation("6");
        console.log("Menu for location 6:", menu);

        // Calculate cart for an item
        const cartItems = [
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
        ];

        const calculatedCart = await client.calculateCart(cartItems, "12");

        // Update cart with calculated values
        const orderCart = {
            ...calculatedCart.cartData,
            grand_total: "385",
            pickup_time_max: "12",
            pickup_time_min: "10",
            subtotal: "385",
            checkout_select_choiceids: ["782"],
        };

        // Process the order
        const orderId = await client.processOrder(orderCart);

        // Check order status
        const orderStatus = await client.checkOrderStatus(orderId);
        console.log("Order status:", orderStatus);
    } catch (error) {
        console.error("Error in main flow:", error);
    }
}

// main(); // Uncomment to run
