// __tests__/MobileOrderClient.test.ts

import { describe, it, expect, beforeEach } from "@jest/globals";
import axios from "axios";
jest.mock("axios");
import { MobileOrderClient } from "./request";

describe("MobileOrderClient", () => {
    it("initializes state with credentials correctly", () => {
        const credentials = { username: "user", password: "pass" };
        const config = {
            baseApiUrl: "https://api.example.com",
            baseIdpUrl: "https://idp.example.com",
            campusId: "4",
            secretKey: "secret",
        };
        const client = new MobileOrderClient(credentials, config);
        const state = (client as any).state;

        expect(state.loginToken).toBe("");
        expect(state.userId).toBe("");
        // sessionId is generated from Date.now().toString(), so it should be numeric
        expect(state.sessionId).toMatch(/^\d+$/);
        expect(state.cookies).toEqual({});
    });

    it("initializes state with token config correctly", () => {
        const config = {
            baseApiUrl: "https://api.example.com",
            baseIdpUrl: "https://idp.example.com",
            campusId: "4",
            secretKey: "secret",
        };
        const tokenConfig = {
            userId: "12345",
            loginToken: "tokentokentoken",
            sessionId: "mysession123",
        };
        const client = new MobileOrderClient(config, tokenConfig);
        const state = (client as any).state;

        expect(state.loginToken).toBe("tokentokentoken");
        expect(state.userId).toBe("12345");
        expect(state.sessionId).toBe("mysession123");
        expect(state.cookies).toEqual({});
    });

    it("stores cookies and returns correct Cookie header", () => {
        const credentials = { username: "u", password: "p" };
        const config = {
            baseApiUrl: "https://api.example.com",
            baseIdpUrl: "https://idp.example.com",
            campusId: "4",
            secretKey: "secret",
        };
        const client = new MobileOrderClient(credentials, config);

        // simulate a response with two Set-Cookie headers
        const fakeResponse: any = {
            headers: {
                "set-cookie": [
                    "foo=bar; Path=/; HttpOnly",
                    "baz=qux; Secure; SameSite=Strict",
                ],
            },
        };

        // call the private method
        (client as any).storeCookies(fakeResponse);

        // verify internal cookies map
        expect((client as any).state.cookies).toEqual({
            foo: "bar",
            baz: "qux",
        });

        // verify header string
        expect((client as any).getCookieHeader()).toBe("foo=bar; baz=qux");
    });

    it("arrayBufferToHexString converts buffer correctly", () => {
        const credentials = { username: "u", password: "p" };
        const config = {
            baseApiUrl: "https://api.example.com",
            baseIdpUrl: "https://idp.example.com",
            campusId: "4",
            secretKey: "secret",
        };
        const client = new MobileOrderClient(credentials, config);

        // create a small ArrayBuffer [0x00, 0xff, 0x10]
        const buffer = new Uint8Array([0, 255, 16]).buffer;
        const hex = (client as any).arrayBufferToHexString(buffer);

        expect(hex).toBe("00ff10");
    });

    it("login() throws error when no credentials provided", async () => {
        const config = {
            baseApiUrl: "https://api.example.com",
            baseIdpUrl: "https://idp.example.com",
            campusId: "4",
            secretKey: "secret",
        };
        const tokenConfig = {
            userId: "12345",
            loginToken: "tok",
            // sessionId is optional here
        };
        const client = new MobileOrderClient(config, tokenConfig as any);

        await expect(client.login()).rejects.toThrow(
            "Cannot login: No credentials provided"
        );
    });
});
