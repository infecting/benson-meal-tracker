import express, { Express, Request, Response } from "express";
import cors from "cors";
import { MobileOrderClient } from "./request";

// Load environment variables
const mapping = {
    "13": "Fire Grill",
    "6": "Spice Market",
    "870": "Trattoria",
    "3": "Slice",
    "9": "La Parilla",
    "1633": "Simply Oasis",
    "534": "Sushi",
};

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
app.post("/login", async (req, res) => {
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
        console.log(loginResp);
        res.json({ token: loginResp });
    } catch (e) {
        console.log(e.message);
        res.json({ error: e.message });
    }
});

app.post("/getPastOrders", async (req, res) => {
    try {
        let client = new MobileOrderClient(
            {
                baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
                baseIdpUrl: "https://login.scu.edu",
                campusId: "4",
                secretKey: "dFz9Dq435BT3xCVU2PCy",
            },
            {
                userId: req.body.userId,
                loginToken: req.body.loginToken,
                sessionId: req.body.sessionId,
            }
        );
        const pastOrders = await client.getPastOrders();
        console.log(pastOrders);
        res.json(pastOrders);
    } catch (e) {
        console.log(e.message);
        res.json({ error: e.message });
    }
});

app.post("/getWrapped", async (req, res) => {
    try {
        let client = new MobileOrderClient(
            {
                baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
                baseIdpUrl: "https://login.scu.edu",
                campusId: "4",
                secretKey: "dFz9Dq435BT3xCVU2PCy",
            },
            {
                userId: req.body.userId,
                loginToken: req.body.loginToken,
                sessionId: req.body.sessionId,
            }
        );
        const pastOrders = await client.getPastOrders();
        console.log(pastOrders);
        const mostFrequent = { "1": 0 };
        for (let order of pastOrders.orders) {
            if (mostFrequent[order.locationid]) {
                mostFrequent[order.locationid] =
                    mostFrequent[order.locationid] + 1;
            } else {
                mostFrequent[order.locationid] = 1;
            }
        }
        let x = {};
        for (let key in mostFrequent) {
            if (mapping[key]) {
                x[mapping[key]] = mostFrequent[key];
            }
        }
        console.log(mostFrequent);
        res.json(x);
    } catch (e) {
        console.log(e.message);
        res.json({ error: e.message });
    }
});

app.post("/getMenu", async (req, res) => {
    try {
        let client = new MobileOrderClient(
            {
                baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
                baseIdpUrl: "https://login.scu.edu",
                campusId: "4",
                secretKey: "dFz9Dq435BT3xCVU2PCy",
            },
            {
                userId: req.body.userId,
                loginToken: req.body.loginToken,
                sessionId: req.body.sessionId,
            }
        );
        const menuResponse = await client.getMenuForLocation("" + req.query.l);
        console.log(menuResponse);
        res.json(menuResponse);
    } catch (e) {
        console.log(e.message);
        res.json({ error: e.message });
    }
});

/*
app.post("/rateOrder", async (req, res) => { //Allows for rating orders, as scraped from the API, unfinished
    try {
        let client = new MobileOrderClient(
            {
                baseApiUrl: "https://mobileorderprodapi.transactcampus.com",
                baseIdpUrl: "https://login.scu.edu",
                campusId: "4",
                secretKey: "dFz9Dq435BT3xCVU2PCy",
            },
            {
                userId: req.body.userId,
                loginToken: req.body.loginToken,
                sessionId: req.body.sessionId,
            }
        );
        
        //more code goes here...
        

    } catch (e) {
        console.log(e.message);
        res.json({ error: e.message });
    }
});
*/

// Import connectDB (uncomment when ready to use a database)
// import connectDB from './config/database';

// Start server
app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
