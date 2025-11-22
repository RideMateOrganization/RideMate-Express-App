import { ExpenseCategory } from './constants.js';

function checkRideAccess(ride, userId) {
  const isOwner = ride.owner.toString() === userId.toString();
  const isParticipant = ride.participants.some(
    (p) => p.user.toString() === userId.toString() && p.isApproved,
  );
  return isOwner || isParticipant;
}

function checkExpenseAuthorization(expense, ride, userId) {
  const isExpenseCreator = expense.user.toString() === userId.toString();
  const isRideOwner = ride.owner.toString() === userId.toString();
  return isExpenseCreator || isRideOwner;
}

function formatCategoryLabel(category) {
  const labels = {
    [ExpenseCategory.FUEL]: 'Fuel',
    [ExpenseCategory.FOOD]: 'Food & Drink',
    [ExpenseCategory.LODGING]: 'Lodging',
    [ExpenseCategory.MAINTENANCE]: 'Maintenance',
    [ExpenseCategory.TOLLS]: 'Tolls',
    [ExpenseCategory.OTHER]: 'Other',
  };
  return labels[category] || category;
}

function getCategoryColor(category) {
  const colors = {
    [ExpenseCategory.FUEL]: '#FF6B6B',
    [ExpenseCategory.FOOD]: '#4ECDC4',
    [ExpenseCategory.LODGING]: '#45B7D1',
    [ExpenseCategory.MAINTENANCE]: '#FFA07A',
    [ExpenseCategory.TOLLS]: '#98D8C8',
    [ExpenseCategory.OTHER]: '#F7DC6F',
  };
  return colors[category] || '#CCCCCC';
}

function validateExpenseData(data, isUpdate = false) {
  const errors = {};

  if (!isUpdate || data.description !== undefined) {
    if (!data.description || typeof data.description !== 'string') {
      errors.description = 'Description is required';
    } else if (data.description.trim().length < 3) {
      errors.description = 'Description must be at least 3 characters';
    }
  }

  if (!isUpdate || data.amountInSmallestUnit !== undefined) {
    if (
      data.amountInSmallestUnit === undefined ||
      data.amountInSmallestUnit === null
    ) {
      errors.amountInSmallestUnit = 'Amount in smallest unit is required';
    } else {
      const amount =
        typeof data.amountInSmallestUnit === 'string'
          ? parseInt(data.amountInSmallestUnit, 10)
          : data.amountInSmallestUnit;
      if (!Number.isInteger(amount) || amount <= 0) {
        errors.amountInSmallestUnit =
          'Amount in smallest unit must be a positive integer';
      }
    }
  }

  if (!isUpdate || data.dateTime !== undefined) {
    if (!data.dateTime) {
      errors.dateTime = 'Date time is required';
    } else {
      const dateTime = new Date(data.dateTime);
      if (Number.isNaN(dateTime.getTime())) {
        errors.dateTime = 'Date time must be a valid ISO 8601 datetime string';
      } else {
        const now = new Date();
        if (dateTime > now) {
          errors.dateTime = 'Expense date time cannot be in the future';
        }
      }
    }
  }

  if (!isUpdate || data.category !== undefined) {
    if (!data.category) {
      errors.category = 'Category is required';
    } else if (!Object.values(ExpenseCategory).includes(data.category)) {
      errors.category =
        'Category must be one of: fuel, food, lodging, maintenance, tolls, other';
    }
  }

  if (!isUpdate || data.currencyCode !== undefined) {
    if (!data.currencyCode) {
      errors.currencyCode = 'Currency code is required';
    } else {
      const currencyCode =
        typeof data.currencyCode === 'string'
          ? data.currencyCode.trim().toUpperCase()
          : data.currencyCode;
      if (!/^[A-Z]{3}$/.test(currencyCode)) {
        errors.currencyCode =
          'Currency code must be a valid ISO 4217 code (3 uppercase letters)';
      }
    }
  }

  if (
    data.receipt !== undefined &&
    data.receipt !== null &&
    data.receipt !== ''
  ) {
    try {
      const url = new URL(data.receipt);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.receipt = 'Receipt must be a valid HTTP or HTTPS URL';
      }
    } catch {
      errors.receipt = 'Receipt must be a valid URL';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export {
  checkRideAccess,
  checkExpenseAuthorization,
  formatCategoryLabel,
  getCategoryColor,
  validateExpenseData,
};

