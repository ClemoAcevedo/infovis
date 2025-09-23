/**
 * Main chart module for COVID-19 Chile visualization
 */

import { CHART_CONFIG, COLORS, LINE_STYLES, MILESTONES, CONTENT, BREAKPOINTS } from './config.js';
import {
  formatAxisDate,
  formatPercentage,
  isMobile,
  getTickCount,
  getSafeLabelPosition,
  getResponsiveLineStyle,
  debounce,
  validateData
} from './utils.js';

// Global chart state
let chartSvg, chartGroup, scales, chartData;

/**
 * Builds scales for the chart
 * @param {Array} data - Chart data
 * @param {Object} config - Chart configuration
 * @returns {Object} Object containing all scales
 */
export function buildScales(data, config) {
  const { width, height } = config;

  const xScale = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, width]);

  const yLeftScale = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.deaths_7d)])
    .range([height, 0])
    .nice();

  const yRightScale = d3.scaleLinear()
    .domain([0, 100])
    .range([height, 0]);

  return { xScale, yLeftScale, yRightScale };
}

/**
 * Draws chart axes
 * @param {Object} svg - D3 SVG selection
 * @param {Object} scales - Chart scales
 * @param {Object} config - Chart configuration
 */
export function drawAxes(svg, scales, config) {
  const { width, height } = config;
  const { xScale, yLeftScale, yRightScale } = scales;
  const mobile = isMobile(BREAKPOINTS.mobile);

  // X-axis
  const xAxis = d3.axisBottom(xScale)
    .tickFormat(formatAxisDate)
    .ticks(getTickCount(mobile));

  // Y-axes
  const yLeftAxis = d3.axisLeft(yLeftScale)
    .ticks(6);

  const yRightAxis = d3.axisRight(yRightScale)
    .ticks(5)
    .tickFormat(formatPercentage)
    .tickPadding(8); // Add padding to avoid crowding

  // Draw axes
  const xAxisGroup = svg.append('g')
    .attr('class', 'axis axis--x')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis);

  const yLeftAxisGroup = svg.append('g')
    .attr('class', 'axis axis--left')
    .call(yLeftAxis);

  const yRightAxisGroup = svg.append('g')
    .attr('class', 'axis axis--right')
    .attr('transform', `translate(${width},0)`)
    .call(yRightAxis);

  // Axis titles removed - legend and color-coding provide sufficient context

  // Style axes
  svg.selectAll('.axis .domain')
    .style('stroke', COLORS.grid)
    .style('stroke-width', 1);

  svg.selectAll('.axis .tick line')
    .style('stroke', COLORS.grid)
    .style('stroke-width', 1);

  svg.selectAll('.axis .tick text')
    .style('fill', COLORS.text)
    .style('font-size', '11px');

  // Color-code axis ticks and labels
  yLeftAxisGroup.selectAll('.tick text')
    .style('fill', COLORS.deaths);

  yLeftAxisGroup.selectAll('.tick line')
    .style('stroke', COLORS.deaths)
    .style('opacity', 0.6);

  yRightAxisGroup.selectAll('.tick text')
    .style('fill', COLORS.vaccination);

  yRightAxisGroup.selectAll('.tick line')
    .style('stroke', COLORS.vaccination)
    .style('opacity', 0.6);
}

/**
 * Draws the data lines
 * @param {Object} svg - D3 SVG selection
 * @param {Array} data - Chart data
 * @param {Object} scales - Chart scales
 * @param {Object} config - Chart configuration
 */
export function drawLines(svg, data, scales, config) {
  const { xScale, yLeftScale, yRightScale } = scales;
  const mobile = isMobile(BREAKPOINTS.mobile);

  // Line generators
  const deathsLine = d3.line()
    .x(d => xScale(d.date))
    .y(d => yLeftScale(d.deaths_7d))
    .curve(d3.curveMonotoneX)
    .defined(d => d.date && !isNaN(d.deaths_7d) && isFinite(d.deaths_7d));

  const vaccinationLine = d3.line()
    .x(d => xScale(d.date))
    .y(d => yRightScale(d.vaccinated_pct))
    .curve(d3.curveMonotoneX)
    .defined(d => d.date && !isNaN(d.vaccinated_pct) && isFinite(d.vaccinated_pct));

  // Get responsive styles
  const deathsStyle = getResponsiveLineStyle(
    LINE_STYLES.deaths,
    LINE_STYLES.mobile.deaths,
    mobile
  );

  // Draw deaths line
  svg.append('path')
    .datum(data)
    .attr('class', 'line line--deaths')
    .attr('fill', 'none')
    .attr('stroke', COLORS.deaths)
    .attr('stroke-width', deathsStyle.strokeWidth)
    .attr('stroke-opacity', deathsStyle.strokeOpacity)
    .attr('d', deathsLine);

  // Draw vaccination line
  svg.append('path')
    .datum(data)
    .attr('class', 'line line--vaccination')
    .attr('fill', 'none')
    .attr('stroke', COLORS.vaccination)
    .attr('stroke-width', LINE_STYLES.vaccination.strokeWidth)
    .attr('stroke-opacity', LINE_STYLES.vaccination.strokeOpacity)
    .attr('d', vaccinationLine);
}

/**
 * Adds milestone lines and labels
 * @param {Object} svg - D3 SVG selection
 * @param {Object} scales - Chart scales
 * @param {Object} config - Chart configuration
 */
export function addMilestones(svg, scales, config) {
  const { xScale } = scales;
  const { width, height } = config;

  // Create defs element if it doesn't exist
  if (svg.select('defs').empty()) {
    svg.append('defs');
  }

  MILESTONES.forEach(milestone => {
    const milestoneDate = d3.timeParse('%Y-%m-%d')(milestone.date);
    const x = xScale(milestoneDate);

    if (x >= 0 && x <= width) {
      // Add milestone line
      svg.append('line')
        .attr('class', `milestone milestone--${milestone.style}`)
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', COLORS.milestone[milestone.style])
        .attr('stroke-width', milestone.strokeWidth)
        .attr('stroke-dasharray', milestone.dashArray)
        .attr('stroke-opacity', 0.4);

      // Add milestone label with arrow pointing down
      const labelGroup = svg.append('g')
        .attr('class', 'milestone-label')
        .attr('transform', `translate(${x}, ${milestone.yOffset})`);

      labelGroup.append('text')
        .attr('class', 'milestone-text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('fill', '#888')
        .style('font-weight', '400')
        .text(milestone.label);

      // Add downward arrow
      labelGroup.append('line')
        .attr('x1', 0)
        .attr('y1', 5)
        .attr('x2', 0)
        .attr('y2', 15)
        .attr('stroke', '#666')
        .attr('stroke-width', 1)
        .attr('marker-end', 'url(#milestone-arrow)');

      // Add arrow marker for milestones if not exists
      if (svg.select('#milestone-arrow').empty()) {
        svg.select('defs').append('marker')
          .attr('id', 'milestone-arrow')
          .attr('markerWidth', 4)
          .attr('markerHeight', 4)
          .attr('refX', 2)
          .attr('refY', 2)
          .attr('orient', 'auto')
          .append('polygon')
          .attr('points', '0 0, 4 2, 0 4')
          .attr('fill', '#666');
      }
    }
  });
}

/**
 * Adds direct labels outside the chart area for cleaner appearance
 * @param {Object} svg - D3 SVG selection
 * @param {Array} data - Chart data
 * @param {Object} scales - Chart scales
 * @param {Object} config - Chart configuration
 */
export function addDirectLabels(svg, data, scales, config) {
  const { width, height } = config;

  if (data.length === 0) return;

  // Add legend outside chart area
  const legendGroup = svg.append('g')
    .attr('class', 'legend')
    .attr('transform', `translate(${width - 160}, -35)`);

  // Add source footnote below chart
  svg.append('text')
    .attr('class', 'source-footnote')
    .attr('x', 0)
    .attr('y', height + 35)
    .style('font-size', '10px')
    .style('fill', '#777')
    .text('Fuente: MinCiencia y MINSAL — DP37, DP77, DP10. Cobertura máxima alcanzada: ~90% de la población.');

  // Deaths legend item
  legendGroup.append('line')
    .attr('x1', 0)
    .attr('x2', 20)
    .attr('y1', 0)
    .attr('y2', 0)
    .attr('stroke', COLORS.deaths)
    .attr('stroke-width', LINE_STYLES.deaths.strokeWidth);

  legendGroup.append('text')
    .attr('x', 25)
    .attr('y', 4)
    .attr('fill', COLORS.deaths)
    .attr('class', 'legend-text')
    .style('font-size', '12px')
    .style('font-weight', '400')
    .text(CONTENT.labels.deaths);

  // Vaccination legend item
  legendGroup.append('line')
    .attr('x1', 0)
    .attr('x2', 20)
    .attr('y1', 15)
    .attr('y2', 15)
    .attr('stroke', COLORS.vaccination)
    .attr('stroke-width', LINE_STYLES.vaccination.strokeWidth);

  legendGroup.append('text')
    .attr('x', 25)
    .attr('y', 19)
    .attr('fill', COLORS.vaccination)
    .attr('class', 'legend-text')
    .style('font-size', '12px')
    .style('font-weight', '400')
    .text(CONTENT.labels.vaccination);
}

/**
 * Adds narrative annotation with arrow
 * @param {Object} svg - D3 SVG selection
 * @param {Object} scales - Chart scales
 * @param {Object} config - Chart configuration
 */
export function addAnnotations(svg, scales, config) {
  const { xScale } = scales;
  const { height } = config;

  // Add arrow marker definition
  svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('markerWidth', 6)
    .attr('markerHeight', 4)
    .attr('refX', 5)
    .attr('refY', 2)
    .attr('orient', 'auto')
    .append('polygon')
    .attr('points', '0 0, 6 2, 0 4')
    .attr('fill', '#666');

  // Position annotation
  const annotationDate = d3.timeParse('%Y-%m-%d')(CONTENT.annotation.date);
  const annotationX = xScale(annotationDate);
  const annotationY = height * 0.7;

  // Arrow (shortened and repositioned)
  svg.append('line')
    .attr('class', 'annotation-arrow')
    .attr('x1', annotationX - 50)
    .attr('y1', annotationY + 10)
    .attr('x2', annotationX - 15)
    .attr('y2', annotationY - 25)
    .attr('stroke', '#666')
    .attr('stroke-width', 1)
    .attr('marker-end', 'url(#arrowhead)');

  // Annotation text
  svg.append('text')
    .attr('class', 'annotation-text')
    .attr('x', annotationX - 75)
    .attr('y', annotationY + 15)
    .attr('fill', '#666')
    .attr('text-anchor', 'middle')
    .text(CONTENT.annotation.text1);

  svg.append('text')
    .attr('class', 'annotation-text')
    .attr('x', annotationX - 75)
    .attr('y', annotationY + 27)
    .attr('fill', '#666')
    .attr('text-anchor', 'middle')
    .text(CONTENT.annotation.text2);
}

/**
 * Makes the chart responsive
 */
export function makeResponsive() {
  const container = d3.select('#chart-container');
  const svg = d3.select('#chart-root');

  if (svg.empty()) return;

  const resizeChart = debounce(() => {
    // Clear existing chart
    svg.selectAll('*').remove();

    // Rebuild chart
    if (chartData && chartData.length > 0) {
      const config = {
        width: CHART_CONFIG.width - CHART_CONFIG.margin.left - CHART_CONFIG.margin.right,
        height: CHART_CONFIG.height - CHART_CONFIG.margin.top - CHART_CONFIG.margin.bottom
      };

      chartGroup = svg.append('g')
        .attr('transform', `translate(${CHART_CONFIG.margin.left},${CHART_CONFIG.margin.top})`);

      scales = buildScales(chartData, config);
      drawAxes(chartGroup, scales, config);
      drawLines(chartGroup, chartData, scales, config);
      addMilestones(chartGroup, scales, config);
      addDirectLabels(chartGroup, chartData, scales, config);
      }
  }, 250);

  window.addEventListener('resize', resizeChart);
}

/**
 * Initializes the chart
 */
export async function initChart() {
  try {
    // Load data
    const rawData = await d3.csv('assets/data.csv');

    // Process data
    chartData = rawData
      .map(d => ({
        date: d3.timeParse('%Y-%m-%d')(d.date),
        deaths_7d: +d.deaths_7d,
        vaccinated_pct: +d.vaccinated_pct
      }))
      .filter(d =>
        d.date instanceof Date &&
        typeof d.deaths_7d === 'number' &&
        typeof d.vaccinated_pct === 'number' &&
        !isNaN(d.deaths_7d) &&
        !isNaN(d.vaccinated_pct) &&
        isFinite(d.deaths_7d) &&
        isFinite(d.vaccinated_pct)
      );

    if (chartData.length === 0) {
      throw new Error('No valid data found');
    }

    // Setup chart dimensions
    const config = {
      width: CHART_CONFIG.width - CHART_CONFIG.margin.left - CHART_CONFIG.margin.right,
      height: CHART_CONFIG.height - CHART_CONFIG.margin.top - CHART_CONFIG.margin.bottom
    };

    // Create SVG
    chartSvg = d3.select('#chart-root')
      .attr('viewBox', `0 0 ${CHART_CONFIG.width} ${CHART_CONFIG.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    chartGroup = chartSvg.append('g')
      .attr('transform', `translate(${CHART_CONFIG.margin.left},${CHART_CONFIG.margin.top})`);

    // Build chart
    scales = buildScales(chartData, config);
    drawAxes(chartGroup, scales, config);
    drawLines(chartGroup, chartData, scales, config);
    addMilestones(chartGroup, scales, config);
    addDirectLabels(chartGroup, chartData, scales, config);

    // Setup responsiveness
    makeResponsive();

  } catch (error) {
    console.error('Error initializing chart:', error);
    d3.select('#chart-container').html(
      '<p class="error-message">Error cargando datos. Verificar que assets/data.csv existe.</p>'
    );
  }
}