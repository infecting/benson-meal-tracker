// __tests__/DiningPointsManager.test.ts

import { describe, it, expect, beforeEach } from "@jest/globals";
import axios from "axios";
import { DiningPointsManager } from "./dp";

describe("DiningPointsManager (imaginary class)", () => {
    let manager: DiningPointsManager;

    beforeEach(() => {
        // start each test with an empty points map
        manager = new DiningPointsManager({});
    });

    it("initializes with provided mapping", () => {
        const initial = { "13": 100, "6": 50 };
        manager = new DiningPointsManager(initial);
        expect(manager.getPoints("13")).toBe(100);
        expect(manager.getPoints("6")).toBe(50);
    });

    it("addPoints() increments points correctly", () => {
        manager.addPoints("13", 10);
        expect(manager.getPoints("13")).toBe(10);

        manager.addPoints("13", 5);
        expect(manager.getPoints("13")).toBe(15);
    });

    it("getPoints() returns zero for unknown location", () => {
        expect(manager.getPoints("999")).toBe(0);
    });

    it("highestPointLocation() returns the ID with the most points", () => {
        manager.addPoints("a", 5);
        manager.addPoints("b", 20);
        manager.addPoints("c", 15);

        expect(manager.highestPointLocation()).toBe("b");
    });

    it("reset() clears all points and highestPointLocation becomes empty", () => {
        manager.addPoints("x", 42);
        expect(manager.getPoints("x")).toBe(42);

        manager.reset();
        expect(manager.getPoints("x")).toBe(0);
        expect(manager.highestPointLocation()).toBe("");
    });
});
