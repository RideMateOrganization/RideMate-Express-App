import express from 'express';
import protect from '../../middleware/auth.js';
import { cacheUserExpenses } from '../../middleware/cache.js';
import { getUserTotalExpenses } from '../../controller/expense.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User total expenses route (standalone) - CRITICAL: Cache this expensive endpoint
router.get('/total', cacheUserExpenses(), getUserTotalExpenses);

export default router;
