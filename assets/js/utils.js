/**
 * Utility functions for the COVID-19 Chile visualization
 */

/**
 * Formats a date for display on axis ticks
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatAxisDate(date) {
  return d3.timeFormat('%b %Y')(date);
}

/**
 * Formats percentage values
 * @param {number} value - The percentage value
 * @returns {string} Formatted percentage string
 */
export function formatPercentage(value) {
  return `${value}%`;
}

/**
 * Checks if the current viewport is mobile
 * @param {number} breakpoint - Mobile breakpoint in pixels
 * @returns {boolean} True if mobile viewport
 */
export function isMobile(breakpoint = 480) {
  return window.innerWidth <= breakpoint;
}

/**
 * Gets responsive tick count based on viewport size
 * @param {boolean} mobile - Whether viewport is mobile
 * @returns {number} Number of ticks to display
 */
export function getTickCount(mobile = false) {
  return mobile ? 4 : 6;
}

/**
 * Calculates safe label positioning to avoid clipping
 * @param {number} x - Original x position
 * @param {number} width - Chart width
 * @param {number} labelWidth - Estimated label width
 * @returns {object} Object with x position and text anchor
 */
export function getSafeLabelPosition(x, width, labelWidth = 100) {
  const rightEdge = x + labelWidth;
  const needsRepositioning = rightEdge > width;

  return {
    x: needsRepositioning ? x - labelWidth - 8 : x + 8,
    textAnchor: needsRepositioning ? 'end' : 'start'
  };
}

/**
 * Calculates responsive font size
 * @param {string} baseSize - Base font size (e.g., '12px')
 * @param {boolean} mobile - Whether viewport is mobile
 * @returns {string} Adjusted font size
 */
export function getResponsiveFontSize(baseSize, mobile = false) {
  if (!mobile) return baseSize;

  const size = parseInt(baseSize.replace('px', ''));
  return `${Math.max(10, size - 1)}px`;
}

/**
 * Creates responsive line style based on viewport
 * @param {object} baseStyle - Base line style
 * @param {object} mobileStyle - Mobile line style
 * @param {boolean} mobile - Whether viewport is mobile
 * @returns {object} Appropriate line style
 */
export function getResponsiveLineStyle(baseStyle, mobileStyle, mobile = false) {
  return mobile ? { ...baseStyle, ...mobileStyle } : baseStyle;
}

/**
 * Debounce function for resize events
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 250) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Validates data structure
 * @param {Array} data - Data array to validate
 * @returns {boolean} True if data is valid
 */
export function validateData(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  return data.every(d =>
    d.date instanceof Date &&
    typeof d.deaths_7d === 'number' &&
    typeof d.vaccinated_pct === 'number' &&
    !isNaN(d.deaths_7d) &&
    !isNaN(d.vaccinated_pct) &&
    isFinite(d.deaths_7d) &&
    isFinite(d.vaccinated_pct)
  );
}