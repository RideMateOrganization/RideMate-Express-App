import express from 'express';
import protect from '../../middleware/auth.js';
import { getUserTotalExpenses } from '../../controller/expense.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User total expenses route (standalone)
router.get('/total', getUserTotalExpenses);

export default router;
