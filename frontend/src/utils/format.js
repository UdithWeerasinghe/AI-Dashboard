/**
 * Format a value as LKR in millions (e.g., 1,234.56)
 * @param {number|null|undefined} value - The value to format
 * @returns {string} Formatted value or 'N/A'
 */
export const formatLkrMn = (value) =>
  value !== null && value !== undefined
    ? `${(value / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : 'N/A';

/**
 * Format a value as USD in thousands (e.g., 1,234.56)
 * @param {number|null|undefined} value - The value to format
 * @returns {string} Formatted value or 'N/A'
 */
export const formatUsdTh = (value) =>
  value !== null && value !== undefined
    ? `${(value / 1_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : 'N/A';

/**
 * Format a value as a percentage (e.g., 12.34%)
 * @param {number|null|undefined} value - The value to format
 * @returns {string} Formatted value or 'N/A'
 */
export const formatPercentage = (value) =>
  value !== null && value !== undefined
    ? `${value.toFixed(2)}%`
    : 'N/A';

/**
 * Format a value as a number with a given number of decimal places
 * @param {number|null|undefined} value - The value to format
 * @param {number} [digits=2] - Number of decimal places
 * @returns {string} Formatted value or 'N/A'
 */
export const formatNumber = (value, digits = 2) =>
  value !== null && value !== undefined
    ? value.toLocaleString('en-US', { maximumFractionDigits: digits })
    : 'N/A'; 