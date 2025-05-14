const mapping = {
    "13": "Fire Grill",
    "6": "Spice Market",
    "870": "Trattoria",
    "3": "Slice",
    "9": "La Parilla",
    "1633": "Simply Oasis",
    "534": "Sushi",
    "1634": "Acai Bowl",
    "10": "Mission Bakery",
    "812": "The Chef's Table",
};

export function getMostFrequentPlace(pastOrders: any): string {
    const mostFrequent: Record<string, number> = {};
    let maxCount = 0;
    let mostFrequentLocationId = "";

    // Count frequency of each location
    for (let order of pastOrders.orders) {
        if (order.locationid) {
            if (mostFrequent[order.locationid]) {
                mostFrequent[order.locationid] += 1;
            } else {
                mostFrequent[order.locationid] = 1;
            }

            if (mostFrequent[order.locationid] > maxCount) {
                maxCount = mostFrequent[order.locationid];
                mostFrequentLocationId = order.locationid;
            }
        }
    }

    // Return the mapped name of the most frequent location
    return mapping[mostFrequentLocationId] || "";
}
export function getMostFrequentOrder(pastOrders: any): string {
    const mostFrequent: Record<string, number> = {};
    let maxCount = 0;
    let mostFrequentItem = "";

    for (let order of pastOrders.orders) {
        if (order.items && order.items[0]) {
            const itemName = order.items[0].name;
            if (mostFrequent[itemName]) {
                mostFrequent[itemName] += 1;
            } else {
                mostFrequent[itemName] = 1;
            }

            if (mostFrequent[itemName] > maxCount) {
                maxCount = mostFrequent[itemName];
                mostFrequentItem = itemName;
            }
        }
    }

    return mostFrequentItem;
}
export function moneySpent(pastOrders: any) {
    let s = 0;
    for (let order of pastOrders.orders) {
        s += order.mealplan_total;
    }
    return s;
}

function convertToDateObject(dateTimeStr: string) {
    // Parse the date string components
    const [datePart, timePart] = dateTimeStr.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes, seconds] = timePart.split(":").map(Number);

    // Create date with explicit PST/PDT offset (-7 hours from UTC for PDT)
    // Note: If you're in standard time (PST) not daylight time (PDT), use -8 instead of -7
    return hours;
}

// For debugging - shows that the hour is preserved
function testTimeConversion(dateTimeStr: string) {
    const date = convertToDateObject(dateTimeStr);

    return date;
}

// Group orders by hour of day
function groupOrdersByHourOfDay(pastOrders: any) {
    const hourGroups = {};

    for (let order of pastOrders.orders) {
        if (order.pickup_datetime) {
            const hour = order.order_local_time.split(":")[0];
            // Use getUTCHours to get the hour we explicitly set

            // Initialize array for this hour if it doesn't exist
            if (!hourGroups[hour]) {
                hourGroups[hour] = [];
            }

            // Add order to the appropriate hour group
            hourGroups[hour].push(order);
        }
    }

    return hourGroups;
}

export function getOrderDistributionByHour(pastOrders: any) {
    const hourGroups = groupOrdersByHourOfDay(pastOrders);
    const distribution = {};

    // Convert to percentage or count as needed
    console.log(hourGroups["0"]);
    for (const hour in hourGroups) {
        distribution[hour] = hourGroups[hour].length;
    }

    return distribution;
}

//  {
//                 itemid: 6204192,
//                 sectionid: 56069,
//                 upsell_upsellid: 0,
//                 upsell_variantid: 0,
//                 options: [
//                     {
//                         optionid: 494263,
//                         values: [
//                             {
//                                 valueid: 804727,
//                                 combo_itemid: 0,
//                                 combo_items: [],
//                             },
//                         ],
//                     },
//                 ],
//                 meal_ex_applied: false,
//             },

interface MenuItem {
    id: number;
    sectionid: number;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl?: string;
    available: boolean;
    options?: OptionVal[][];
}

export function cleanMenu(menuResponse: any) {
    let finalR: MenuItem[] = [];
    const sections = menuResponse.menu.sections_1;
    for (let section of sections) {
        for (let item of section.items) {
            console.log(item);
            if (
                item.manual_online != 0 &&
                item.is_hidden != 1
                // item.manual_online_datetime != ""
            ) {
                finalR.push({
                    id: item.itemid,
                    sectionid: item.sectionid,
                    name: item.name,
                    description: item.description,
                    price: parseInt(item.price_display) / 100,
                    category: "",
                    available: item.unavailable_reason != 0 ? false : true,
                    options: cleanOptions(item.options),
                });
            }
        }
    }
    return finalR;
}

interface OptionVal {
    price: number;
    name: string;
    optId: number;
    valueId: number;
}
function cleanOptions(options: any) {
    let final: any = [];
    for (let option of options) {
        let r: OptionVal[] = [];
        for (let val of option.values) {
            r.push({
                price: val.price / 100,
                name: val.qp_name,
                optId: option.optionid,
                valueId: val.valueid,
            });
        }
        final.push(r);
    }
    return final;
}
