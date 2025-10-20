import { getTestDataService } from "../service/test.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Test Data Controller - Demonstrates coding practices
export const getTestData = async (req, res, next) => {
    try {
        const { category } = req.query;

        const data = await getTestDataService(category);

        res.status(200).json(
            ApiResponse.success(
                200,
                "Test data retrieved successfully",
                data
            )
        );
    } catch (error) {
        next(error);
    }
};

