import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const errorHandler = (err, req, res, next) => {
    if (err instanceof ApiError) {
        res.status(err.statusCode).json(
            ApiResponse.error(err.statusCode, err.message, err.data)
        );
    } else {
        res.status(500).json(
            ApiResponse.error(500, "Internal Server Error", null)
        );
    }
};
