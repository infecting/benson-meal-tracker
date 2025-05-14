export class DiningPointsManager {
    private points: Record<string, number>;

    constructor(initialPoints: Record<string, number> = {}) {
        // Create a shallow copy to avoid external mutations
        this.points = { ...initialPoints };
    }

    /**
     * Get the current points for a given location ID.
     * Returns 0 if the ID is not present.
     */
    getPoints(locationId: string): number {
        return this.points[locationId] ?? 0;
    }

    /**
     * Add points to a given location ID. If the ID doesn't exist, it will be created.
     */
    addPoints(locationId: string, pointsToAdd: number): void {
        const current = this.points[locationId] ?? 0;
        this.points[locationId] = current + pointsToAdd;
    }

    /**
     * Returns the location ID with the highest point total.
     * If there are no entries or all zeros, returns an empty string.
     */
    highestPointLocation(): string {
        let maxPoints = -Infinity;
        let maxId = "";

        for (const id in this.points) {
            const pts = this.points[id];
            if (pts > maxPoints) {
                maxPoints = pts;
                maxId = id;
            }
        }

        return maxPoints > -Infinity ? maxId : "";
    }

    /**
     * Resets all points back to zero (clears the internal mapping).
     */
    reset(): void {
        this.points = {};
    }
}
