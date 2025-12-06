import mongoose from 'mongoose';
import Expense from '../models/expense.js';
import Ride from '../models/ride.js';
import { ExpenseCategory } from '../utils/constants.js';
import {
  checkRideAccess,
  checkExpenseAuthorization,
  formatCategoryLabel,
  getCategoryColor,
  validateExpenseData,
} from '../utils/expense-helpers.js';
import { invalidateExpensesCache } from '../utils/cache.js';

async function createExpense(req, res) {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;
    const {
      description,
      amountInSmallestUnit,
      dateTime,
      category,
      currencyCode,
      receipt,
      notes,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(rideId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RIDE_ID',
          message: 'Invalid ride ID format',
        },
      });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RIDE_NOT_FOUND',
          message: 'Ride not found',
        },
      });
    }

    if (!checkRideAccess(ride, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message:
            'You must be a participant or owner of the ride to create expenses',
        },
      });
    }

    const validation = validateExpenseData({
      description,
      amountInSmallestUnit,
      dateTime,
      category,
      currencyCode,
      receipt,
    });
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: validation.errors,
        },
      });
    }

    const expense = await Expense.create({
      ride: rideId,
      user: userId,
      description: description.trim(),
      amountInSmallestUnit: parseInt(amountInSmallestUnit, 10),
      dateTime: new Date(dateTime),
      category,
      currencyCode: currencyCode.trim().toUpperCase(),
      receipt: receipt || null,
      notes: notes || null,
    });

    await expense.populate({
      path: 'user',
      select: 'name email image phoneNumber',
      populate: { path: 'profile', select: 'handle' },
    });

    // Invalidate expense caches after creating new expense
    await invalidateExpensesCache(userId, rideId);

    res.status(201).json({
      success: true,
      data: {
        id: expense.id,
        rideId: expense.ride.toString(),
        description: expense.description,
        amountInSmallestUnit: expense.amountInSmallestUnit,
        dateTime: expense.dateTime.toISOString(),
        category: expense.category,
        currencyCode: expense.currencyCode,
        receipt: expense.receipt,
        notes: expense.notes || null,
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString(),
      },
      message: 'Expense created successfully',
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: messages.join(', '),
        },
      });
    }
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}

async function updateExpense(req, res) {
  try {
    const { rideId, expenseId } = req.params;
    const userId = req.user.id;
    const {
      description,
      amountInSmallestUnit,
      dateTime,
      category,
      currencyCode,
      receipt,
      notes,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(rideId) ||
      !mongoose.Types.ObjectId.isValid(expenseId)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid ride ID or expense ID format',
        },
      });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RIDE_NOT_FOUND',
          message: 'Ride not found',
        },
      });
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EXPENSE_NOT_FOUND',
          message: 'Expense not found',
        },
      });
    }

    if (expense.ride.toString() !== rideId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EXPENSE_MISMATCH',
          message: 'Expense does not belong to this ride',
        },
      });
    }

    // Check authorization
    if (!checkExpenseAuthorization(expense, ride, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to edit this expense',
        },
      });
    }

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (amountInSmallestUnit !== undefined)
      updateData.amountInSmallestUnit = amountInSmallestUnit;
    if (dateTime !== undefined) updateData.dateTime = dateTime;
    if (category !== undefined) updateData.category = category;
    if (currencyCode !== undefined) updateData.currencyCode = currencyCode;
    if (receipt !== undefined) updateData.receipt = receipt;
    if (notes !== undefined) updateData.notes = notes;

    const validation = validateExpenseData(updateData, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: validation.errors,
        },
      });
    }

    const updateObj = {};
    if (updateData.description !== undefined) {
      updateObj.description = updateData.description.trim();
    }
    if (updateData.amountInSmallestUnit !== undefined) {
      updateObj.amountInSmallestUnit = parseInt(
        updateData.amountInSmallestUnit,
        10,
      );
    }
    if (updateData.dateTime !== undefined) {
      updateObj.dateTime = new Date(updateData.dateTime);
    }
    if (updateData.category !== undefined) {
      updateObj.category = updateData.category;
    }
    if (updateData.currencyCode !== undefined) {
      updateObj.currencyCode = updateData.currencyCode.trim().toUpperCase();
    }
    if (updateData.receipt !== undefined) {
      updateObj.receipt = updateData.receipt || null;
    }
    if (updateData.notes !== undefined) {
      updateObj.notes = updateData.notes ? updateData.notes.trim() : null;
    }

    // Update expense
    const updatedExpense = await Expense.findByIdAndUpdate(
      expenseId,
      updateObj,
      {
        new: true,
        runValidators: true,
      },
    );

    res.status(200).json({
      success: true,
      data: {
        id: updatedExpense.id,
        rideId: updatedExpense.ride.toString(),
        description: updatedExpense.description,
        amountInSmallestUnit: updatedExpense.amountInSmallestUnit,
        dateTime: updatedExpense.dateTime.toISOString(),
        category: updatedExpense.category,
        currencyCode: updatedExpense.currencyCode,
        receipt: updatedExpense.receipt,
        notes: updatedExpense.notes || null,
        createdAt: updatedExpense.createdAt.toISOString(),
        updatedAt: updatedExpense.updatedAt.toISOString(),
      },
      message: 'Expense updated successfully',
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: messages.join(', '),
        },
      });
    }
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}

async function listRideExpenses(req, res) {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;
    const {
      category = 'all',
      limit = 50,
      page = 1,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(rideId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RIDE_ID',
          message: 'Invalid ride ID format',
        },
      });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RIDE_NOT_FOUND',
          message: 'Ride not found',
        },
      });
    }

    if (!checkRideAccess(ride, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message:
            'You must be a participant or owner of the ride to view expenses',
        },
      });
    }

    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const skip = (pageNum - 1) * limitNum;

    const sortFieldMap = {
      date: 'dateTime',
      amount: 'amountInSmallestUnit',
      dateTime: 'dateTime',
      amountInSmallestUnit: 'amountInSmallestUnit',
      category: 'category',
    };
    const sortField = sortFieldMap[sortBy] || 'dateTime';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const filter = { ride: rideId };
    if (
      category !== 'all' &&
      Object.values(ExpenseCategory).includes(category)
    ) {
      filter.category = category;
    }

    const totalCount = await Expense.countDocuments({ ride: rideId });

    const totalAmountResult = await Expense.aggregate([
      { $match: { ride: new mongoose.Types.ObjectId(rideId) } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amountInSmallestUnit' },
        },
      },
    ]);
    const totalAmountInSmallestUnit =
      totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

    const categoryBreakdown = await Expense.aggregate([
      { $match: { ride: new mongoose.Types.ObjectId(rideId) } },
      {
        $group: {
          _id: '$category',
          amountInSmallestUnit: { $sum: '$amountInSmallestUnit' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          amountInSmallestUnit: 1,
          count: 1,
        },
      },
    ]);

    const allCategories = Object.values(ExpenseCategory);
    const categoryMap = {};
    allCategories.forEach((cat) => {
      categoryMap[cat] = { category: cat, amountInSmallestUnit: 0, count: 0 };
    });

    categoryBreakdown.forEach((item) => {
      categoryMap[item.category] = {
        category: item.category,
        amountInSmallestUnit: item.amountInSmallestUnit,
        count: item.count,
      };
    });

    const sortObj = {};
    sortObj[sortField] = sortDirection;

    const expenses = await Expense.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const formattedExpenses = expenses.map((expense) => {
      const { _id, ...rest } = expense;
      return {
        id: _id.toString(),
        description: rest.description,
        amountInSmallestUnit: rest.amountInSmallestUnit,
        dateTime: rest.dateTime.toISOString(),
        category: rest.category,
        currencyCode: rest.currencyCode,
        receipt: rest.receipt || null,
        notes: rest.notes || null,
        createdAt: rest.createdAt.toISOString(),
        updatedAt: rest.updatedAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      data: {
        expenses: formattedExpenses,
        total: totalCount,
        totalAmountInSmallestUnit,
        categoryBreakdown: Object.values(categoryMap),
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (error) {
    console.error('Error listing expenses:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}

async function getExpense(req, res) {
  try {
    const { rideId, expenseId } = req.params;
    const userId = req.user.id;

    if (
      !mongoose.Types.ObjectId.isValid(rideId) ||
      !mongoose.Types.ObjectId.isValid(expenseId)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid ride ID or expense ID format',
        },
      });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RIDE_NOT_FOUND',
          message: 'Ride not found',
        },
      });
    }

    if (!checkRideAccess(ride, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message:
            'You must be a participant or owner of the ride to view expenses',
        },
      });
    }

    const expense = await Expense.findById(expenseId)
      .populate({
        path: 'user',
        select: 'name email image phoneNumber',
        populate: { path: 'profile', select: 'handle' },
      })
      .lean();

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EXPENSE_NOT_FOUND',
          message: 'Expense not found',
        },
      });
    }

    // Verify expense belongs to ride
    if (expense.ride.toString() !== rideId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EXPENSE_MISMATCH',
          message: 'Expense does not belong to this ride',
        },
      });
    }

    const createdBy = {
      id: expense.user.id,
      name: expense.user.name,
      avatar: expense.user.image || null,
    };

    res.status(200).json({
      success: true,
      data: {
        id: expense.id,
        rideId: expense.ride.toString(),
        description: expense.description,
        amountInSmallestUnit: expense.amountInSmallestUnit,
        dateTime: expense.dateTime.toISOString(),
        category: expense.category,
        currencyCode: expense.currencyCode,
        receipt: expense.receipt || null,
        notes: expense.notes || null,
        createdAt: expense.createdAt.toISOString(),
        updatedAt: expense.updatedAt.toISOString(),
        createdBy,
      },
    });
  } catch (error) {
    console.error('Error getting expense:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}

async function deleteExpense(req, res) {
  try {
    const { rideId, expenseId } = req.params;
    const userId = req.user.id;

    if (
      !mongoose.Types.ObjectId.isValid(rideId) ||
      !mongoose.Types.ObjectId.isValid(expenseId)
    ) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid ride ID or expense ID format',
        },
      });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RIDE_NOT_FOUND',
          message: 'Ride not found',
        },
      });
    }

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'EXPENSE_NOT_FOUND',
          message: 'Expense not found',
        },
      });
    }

    // Verify expense belongs to ride
    if (expense.ride.toString() !== rideId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EXPENSE_MISMATCH',
          message: 'Expense does not belong to this ride',
        },
      });
    }

    // Check authorization
    if (!checkExpenseAuthorization(expense, ride, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You are not authorized to delete this expense',
        },
      });
    }

    await Expense.findByIdAndDelete(expenseId);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}

async function getUserTotalExpenses(req, res) {
  try {
    const userId = req.user.id;
    const { month, year, startDate, endDate, view = 'category' } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      if (startDate) {
        const start = new Date(startDate);
        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid startDate format. Use ISO 8601 (YYYY-MM-DD)',
            },
          });
        }
        dateFilter.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_DATE',
              message: 'Invalid endDate format. Use ISO 8601 (YYYY-MM-DD)',
            },
          });
        }
        dateFilter.$lte = end;
      }
    } else if (month) {
      // Parse YYYY-MM format
      const [yearStr, monthStr] = month.split('-');
      if (
        !yearStr ||
        !monthStr ||
        Number.isNaN(parseInt(yearStr, 10)) ||
        Number.isNaN(parseInt(monthStr, 10))
      ) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE',
            message: 'Invalid month format. Use YYYY-MM',
          },
        });
      }
      const start = new Date(
        parseInt(yearStr, 10),
        parseInt(monthStr, 10) - 1,
        1,
      );
      const end = new Date(
        parseInt(yearStr, 10),
        parseInt(monthStr, 10),
        0,
        23,
        59,
        59,
        999,
      );
      dateFilter.$gte = start;
      dateFilter.$lte = end;
    } else if (year) {
      if (Number.isNaN(parseInt(year, 10))) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATE',
            message: 'Invalid year format. Use YYYY',
          },
        });
      }
      const start = new Date(parseInt(year, 10), 0, 1);
      const end = new Date(parseInt(year, 10), 11, 31, 23, 59, 59, 999);
      dateFilter.$gte = start;
      dateFilter.$lte = end;
    }

    const userRides = await Ride.find({
      $or: [
        { owner: userId },
        { 'participants.user': userId, 'participants.isApproved': true },
      ],
    }).select('_id');

    const rideIds = userRides.map((ride) => ride._id);

    const expenseFilter = {
      ride: { $in: rideIds },
    };
    if (Object.keys(dateFilter).length > 0) {
      expenseFilter.dateTime = dateFilter;
    }

    const totalAmountResult = await Expense.aggregate([
      { $match: expenseFilter },
      {
        $group: {
          _id: null,
          total: { $sum: '$amountInSmallestUnit' },
        },
      },
    ]);
    const totalAmountInSmallestUnit =
      totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

    const now = new Date();
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthPromises = [];
    for (let i = 5; i >= 0; i -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1,
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );

      monthPromises.push(
        Expense.aggregate([
          {
            $match: {
              ride: { $in: rideIds },
              dateTime: { $gte: monthStart, $lte: monthEnd },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amountInSmallestUnit' },
            },
          },
        ]).then((monthResult) => ({
          month: monthNames[monthDate.getMonth()],
          year: monthDate.getFullYear(),
          amountInSmallestUnit:
            monthResult.length > 0 ? monthResult[0].total : 0,
          isCurrent: i === 0,
        })),
      );
    }
    const monthlySpending = await Promise.all(monthPromises);

    const categoryResult = await Expense.aggregate([
      { $match: expenseFilter },
      {
        $group: {
          _id: '$category',
          amountInSmallestUnit: { $sum: '$amountInSmallestUnit' },
          transactionCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          amountInSmallestUnit: 1,
          transactionCount: 1,
        },
      },
    ]);

    const allCategories = Object.values(ExpenseCategory);
    const expensesByCategory = allCategories.map((cat) => {
      const found = categoryResult.find((item) => item.category === cat);
      return {
        category: cat,
        label: formatCategoryLabel(cat),
        amountInSmallestUnit: found ? found.amountInSmallestUnit : 0,
        transactionCount: found ? found.transactionCount : 0,
      };
    });

    const rideResult = await Expense.aggregate([
      { $match: expenseFilter },
      {
        $group: {
          _id: '$ride',
          amountInSmallestUnit: { $sum: '$amountInSmallestUnit' },
        },
      },
      {
        $project: {
          _id: 0,
          rideId: '$_id',
          amountInSmallestUnit: 1,
        },
      },
    ]);

    const expensesByRide = await Promise.all(
      rideResult.map(async (item) => {
        const ride = await Ride.findById(item.rideId)
          .select('name startTime')
          .lean();
        return {
          rideId: item.rideId.toString(),
          rideName: ride ? ride.name : 'Unknown Ride',
          date:
            ride && ride.startTime
              ? ride.startTime.toISOString().split('T')[0]
              : null,
          amountInSmallestUnit: item.amountInSmallestUnit,
        };
      }),
    );

    expensesByRide.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });

    const response = {
      success: true,
      data: {
        totalAmountInSmallestUnit,
        monthlySpending,
      },
    };

    if (view === 'category') {
      response.data.expensesByCategory = expensesByCategory;
      response.data.expensesByRide = expensesByRide.slice(0, 5);
    } else if (view === 'ride') {
      response.data.expensesByRide = expensesByRide;
      response.data.expensesByCategory = expensesByCategory.filter(
        (cat) => cat.amountInSmallestUnit > 0,
      );
    } else {
      response.data.expensesByCategory = expensesByCategory;
      response.data.expensesByRide = expensesByRide;
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting user total expenses:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}

async function getRideExpenseStatistics(req, res) {
  try {
    const { rideId } = req.params;
    const userId = req.user.id;

    // Validate ride ID
    if (!mongoose.Types.ObjectId.isValid(rideId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_RIDE_ID',
          message: 'Invalid ride ID format',
        },
      });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RIDE_NOT_FOUND',
          message: 'Ride not found',
        },
      });
    }

    if (!checkRideAccess(ride, userId)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message:
            'You must be a participant or owner of the ride to view statistics',
        },
      });
    }

    const totalAmountResult = await Expense.aggregate([
      { $match: { ride: new mongoose.Types.ObjectId(rideId) } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amountInSmallestUnit' },
        },
      },
    ]);
    const totalAmountInSmallestUnit =
      totalAmountResult.length > 0 ? totalAmountResult[0].total : 0;

    const categoryResult = await Expense.aggregate([
      { $match: { ride: new mongoose.Types.ObjectId(rideId) } },
      {
        $group: {
          _id: '$category',
          amountInSmallestUnit: { $sum: '$amountInSmallestUnit' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          amountInSmallestUnit: 1,
          count: 1,
        },
      },
    ]);

    const categoryBreakdown = categoryResult
      .map((item) => ({
        category: item.category,
        amountInSmallestUnit: item.amountInSmallestUnit,
        percentage:
          totalAmountInSmallestUnit > 0
            ? Math.round(
                (item.amountInSmallestUnit / totalAmountInSmallestUnit) * 10000,
              ) / 100
            : 0,
        count: item.count,
        color: getCategoryColor(item.category),
      }))
      .sort((a, b) => b.amountInSmallestUnit - a.amountInSmallestUnit);

    res.status(200).json({
      success: true,
      data: {
        totalAmountInSmallestUnit,
        categoryBreakdown,
      },
    });
  } catch (error) {
    console.error('Error getting ride expense statistics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      },
    });
  }
}

export {
  createExpense,
  updateExpense,
  listRideExpenses,
  getExpense,
  deleteExpense,
  getUserTotalExpenses,
  getRideExpenseStatistics,
};
