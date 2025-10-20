import { Router } from "express";
import { getTestData } from '../controller/test.controller.js';

const testDataRoutes = Router();

// Test data route
testDataRoutes.get('/', getTestData);

export default testDataRoutes;