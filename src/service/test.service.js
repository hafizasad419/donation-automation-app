import { ApiError } from "../utils/ApiError.js";

// Test Data Service - Demonstrates coding practices
export const getTestDataService = async (category = 'all') => {
    try {
        // Guard clause - validate inputs early
        if (!category) {
            throw new ApiError(400, "Category parameter is required");
        }

        const testData = {
            users: [
                { id: 1, name: "John Doe", email: "john@example.com", role: "user", status: "active" },
                { id: 2, name: "Jane Smith", email: "jane@example.com", role: "admin", status: "active" },
                { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "user", status: "inactive" }
            ],
            products: [
                { id: 1, name: "Laptop", price: 999.99, category: "electronics", stock: 50 },
                { id: 2, name: "Mouse", price: 29.99, category: "electronics", stock: 100 },
                { id: 3, name: "Keyboard", price: 79.99, category: "electronics", stock: 75 }
            ],
            orders: [
                { id: 1, userId: 1, productId: 1, quantity: 1, total: 999.99, status: "completed" },
                { id: 2, userId: 2, productId: 2, quantity: 2, total: 59.98, status: "pending" },
                { id: 3, userId: 1, productId: 3, quantity: 1, total: 79.99, status: "shipped" }
            ]
        };

        // Happy path logic last
        if (category === 'all') {
            return testData;
        }

        if (!testData[category]) {
            throw new ApiError(404, `Category '${category}' not found`);
        }

        return { [category]: testData[category] };
    } catch (error) {
        // Log or report unexpected errors
        console.error('Error in getTestDataService:', error);
        throw new ApiError(500, error?.message || "Failed to fetch test data");
    }
};

