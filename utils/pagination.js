// utils/pagination.js
// Utility functions for pagination

/**
 * Tạo pagination object với metadata
 * @param {number} page - Trang hiện tại (bắt đầu từ 1)
 * @param {number} limit - Số item per page
 * @param {number} totalItems - Tổng số items
 * @returns {Object} Pagination metadata
 */
const createPagination = (page, limit, totalItems) => {
  // Đảm bảo page và limit là số dương
  const currentPage = Math.max(1, parseInt(page) || 1);
  const itemsPerPage = Math.max(1, parseInt(limit) || 10);
  const total = Math.max(0, parseInt(totalItems) || 0);

  // Tính toán
  const totalPages = Math.ceil(total / itemsPerPage);
  const skip = (currentPage - 1) * itemsPerPage;
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    current_page: currentPage,
    items_per_page: itemsPerPage,
    total_items: total,
    total_pages: totalPages,
    has_next_page: hasNextPage,
    has_prev_page: hasPrevPage,
    skip: skip,
    limit: itemsPerPage,
  };
};

/**
 * Tạo pagination cho Mongoose query
 * @param {Object} query - Mongoose query object
 * @param {Object} pagination - Pagination metadata từ createPagination
 * @returns {Object} Query với skip và limit
 */
const applyPagination = (query, pagination) => {
  return query.skip(pagination.skip).limit(pagination.limit);
};

/**
 * Tạo response structure chuẩn với pagination
 * @param {Array} data - Array data
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @param {boolean} success - Success status
 * @returns {Object} Formatted response
 */
const createPaginatedResponse = (
  data,
  pagination,
  message = "Success",
  success = true
) => {
  return {
    message,
    success,
    data: {
      [Array.isArray(data) ? "items" : "item"]: data,
      pagination: {
        current_page: pagination.current_page,
        items_per_page: pagination.items_per_page,
        total_items: pagination.total_items,
        total_pages: pagination.total_pages,
        has_next_page: pagination.has_next_page,
        has_prev_page: pagination.has_prev_page,
      },
    },
  };
};

// Removed: createAppointmentResponse, createPaymentResponse, createTransactionResponse
// Use createPaginatedResponse for all controllers

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Validated pagination parameters
 */
const validatePagination = (page, limit) => {
  const validatedPage = Math.max(1, parseInt(page) || 1);
  const validatedLimit = Math.min(Math.max(1, parseInt(limit) || 10), 100); // Max 100 items per page

  return {
    page: validatedPage,
    limit: validatedLimit,
  };
};

/**
 * Tạo pagination cho Mongoose aggregate
 * @param {Array} pipeline - Mongoose aggregation pipeline
 * @param {Object} pagination - Pagination metadata
 * @returns {Array} Pipeline với $skip và $limit
 */
const applyAggregationPagination = (pipeline, pagination) => {
  return [
    ...pipeline,
    { $skip: pagination.skip },
    { $limit: pagination.limit },
  ];
};

module.exports = {
  createPagination,
  applyPagination,
  createPaginatedResponse,
  validatePagination,
  applyAggregationPagination,
};
