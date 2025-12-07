import express from 'express';
import protect from '../../middleware/auth.js';
// Redis caching temporarily disabled - will be implemented later
// import { cacheUserExpenses } from '../../middleware/cache.js';
import { getUserTotalExpenses } from '../../controller/expense.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User total expenses route (standalone) - caching temporarily disabled
router.get('/total', getUserTotalExpenses);

export default router;
