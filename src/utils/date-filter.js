/**
 * Helper function to calculate date ranges for ride filtering
 * @param {string} dateFilter - The date filter type
 * @returns {Object|null} MongoDB date range query object or null for 'any'
 */
export default function getDateRange(dateFilter) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateFilter) {
    case 'today': {
      return {
        $gte: new Date(today.getTime()),
        $lte: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'tomorrow': {
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      return {
        $gte: new Date(tomorrow.getTime()),
        $lte: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000 - 1),
      };
    }

    case 'this_week': {
      const startOfWeek = new Date(today);
      const dayOfWeek = startOfWeek.getDay();
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const endOfWeek = new Date(
        today.getTime() + daysToSunday * 24 * 60 * 60 * 1000,
      );
      endOfWeek.setHours(23, 59, 59, 999);
      return {
        $gte: now,
        $lte: endOfWeek,
      };
    }

    case 'next_week': {
      const daysUntilMonday = (8 - today.getDay()) % 7;
      const startOfNextWeek = new Date(
        today.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000,
      );
      startOfNextWeek.setHours(0, 0, 0, 0);
      const endOfNextWeek = new Date(
        startOfNextWeek.getTime() + 6 * 24 * 60 * 60 * 1000,
      );
      endOfNextWeek.setHours(23, 59, 59, 999);
      return {
        $gte: startOfNextWeek,
        $lte: endOfNextWeek,
      };
    }

    case 'this_month': {
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      return {
        $gte: now,
        $lte: endOfMonth,
      };
    }

    case 'any':
    default:
      return null;
  }
}
