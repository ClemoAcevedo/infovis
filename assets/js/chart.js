/**
 * Main chart module for COVID-19 Chile visualization
 */

import { CHART_CONFIG, COLORS, LINE_STYLES, MILESTONES, CONTENT, BREAKPOINTS, COMMENTS } from './config.js';
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

  // X-axis - force Spanish formatting
  const xAxis = d3.axisBottom(xScale)
    .ticks(getTickCount(mobile))
    .tickFormat(formatAxisDate);

  // Y-axes
  const yLeftAxis = d3.axisLeft(yLeftScale)
    .ticks(5);

  const yRightAxis = d3.axisRight(yRightScale)
    .ticks(4)
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
    .style('fill', COLORS.deaths)
    .style('opacity', 0.7);

  yLeftAxisGroup.selectAll('.tick line')
    .style('stroke', COLORS.deaths)
    .style('opacity', 0.6);

  yRightAxisGroup.selectAll('.tick text')
    .style('fill', COLORS.vaccination)
    .style('opacity', 0.7);

  yRightAxisGroup.selectAll('.tick line')
    .style('stroke', COLORS.vaccination)
    .style('opacity', 0.4);
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

      // Handle multi-line labels
      if (Array.isArray(milestone.label)) {
        milestone.label.forEach((line, index) => {
          labelGroup.append('text')
            .attr('class', 'milestone-text')
            .attr('x', 0)
            .attr('y', index * 12)
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .style('fill', '#666')
            .style('font-weight', '500')
            .text(line);
        });
      } else {
        labelGroup.append('text')
          .attr('class', 'milestone-text')
          .attr('x', 0)
          .attr('y', 0)
          .attr('text-anchor', 'middle')
          .style('font-size', '11px')
          .style('fill', '#666')
          .style('font-weight', '500')
          .text(milestone.label);
      }

      // Add downward arrow - adjust position for multi-line labels
      const arrowYStart = Array.isArray(milestone.label) ? milestone.label.length * 12 + 3 : 8;
      labelGroup.append('line')
        .attr('x1', 0)
        .attr('y1', arrowYStart)
        .attr('x2', 0)
        .attr('y2', arrowYStart + 10)
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
 * Adds direct labels on the lines for cleaner appearance
 * @param {Object} svg - D3 SVG selection
 * @param {Array} data - Chart data
 * @param {Object} scales - Chart scales
 * @param {Object} config - Chart configuration
 */
export function addDirectLabels(svg, data, scales, config) {
  const { width, height, xScale, yLeftScale, yRightScale } = { ...config, ...scales };

  if (data.length === 0) return;

  // Add source footnote below chart
  svg.append('text')
    .attr('class', 'source-footnote')
    .attr('x', 0)
    .attr('y', height + 35)
    .style('font-size', '10px')
    .style('fill', '#777')
    .text('Fuente: MinCiencia y MINSAL.');

  // Position labels at the end of the chart for better clarity
  const lastDataPoint = data[data.length - 1];

  if (lastDataPoint) {
    const labelX = width - 5; // Position at the right edge

    // Deaths line label - position above the line
    const deathsY = yLeftScale(lastDataPoint.deaths_7d);
    const deathsLabelGroup = svg.append('g').attr('class', 'direct-label deaths-label');

    deathsLabelGroup.append('text')
      .attr('x', labelX)
      .attr('y', deathsY - 35) // Position much higher above the line
      .attr('fill', COLORS.deaths)
      .attr('text-anchor', 'end')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text(CONTENT.labels.deaths);

    // Vaccination line label - position below the line
    const vaccinationY = yRightScale(lastDataPoint.vaccinated_pct);
    const vaccinationLabelGroup = svg.append('g').attr('class', 'direct-label vaccination-label');

    vaccinationLabelGroup.append('text')
      .attr('x', labelX)
      .attr('y', vaccinationY - 5) // Position below the line
      .attr('fill', COLORS.vaccination)
      .attr('text-anchor', 'end')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text(CONTENT.labels.vaccination);
  }

  // Simplified approach - let the right Y-axis handle percentage reference points
  // This avoids clutter while maintaining readability
}

/**
 * Adds narrative annotation with arrow
 * @param {Object} svg - D3 SVG selection
 * @param {Array} data - Chart data
 * @param {Object} scales - Chart scales
 * @param {Object} config - Chart configuration
 */
export function addAnnotations(svg, data, scales, config) {
  const { xScale, yLeftScale, yRightScale } = scales;
  const { height } = config;

  // Add arrow marker definition
  if (svg.select('#arrowhead').empty()) {
    svg.select('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 6)
      .attr('markerHeight', 4)
      .attr('refX', 5)
      .attr('refY', 2)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 6 2, 0 4')
      .attr('fill', '#666');
  }

  // Add Omicron annotation - less visible and properly positioned
  const omicronDate = d3.timeParse('%Y-%m-%d')(CONTENT.omicronAnnotation.date);
  const omicronX = xScale(omicronDate);

  // Find the actual deaths value at the peak to position annotation correctly
  const omicronData = data.find(d => d3.timeFormat('%Y-%m-%d')(d.date) === CONTENT.omicronAnnotation.date);
  const omicronDeathsY = omicronData ? yLeftScale(omicronData.deaths_7d) : height * 0.3;
  const omicronY = omicronDeathsY - 3; // Position text closer to the peak for better arrow connection

  const omicronGroup = svg.append('g')
    .attr('class', 'omicron-annotation')
    .attr('opacity', 0.6); // Make less visible

  // Handle multi-line text
  if (Array.isArray(CONTENT.omicronAnnotation.text)) {
    CONTENT.omicronAnnotation.text.forEach((line, index) => {
      omicronGroup.append('text')
        .attr('x', omicronX + 35) // Move more to the right
        .attr('y', omicronY + (index * 12))
        .attr('fill', '#888')
        .attr('font-size', '10px')
        .attr('font-weight', '400')
        .attr('text-anchor', 'start')
        .text(line);
    });
  } else {
    omicronGroup.append('text')
      .attr('x', omicronX + 35) // Move more to the right
      .attr('y', omicronY)
      .attr('fill', '#888')
      .attr('font-size', '10px')
      .attr('font-weight', '400')
      .attr('text-anchor', 'start')
      .text(CONTENT.omicronAnnotation.text);
  }

  // Horizontal arrow pointing directly to the peak and touching it
  const arrowY = omicronDeathsY; // Keep arrow at the same level as the peak
  omicronGroup.append('line')
    .attr('x1', omicronX + 35) // Start from the beginning of the text
    .attr('y1', arrowY)
    .attr('x2', omicronX) // End exactly at the peak x-coordinate
    .attr('y2', arrowY) // Same y-coordinate for horizontal arrow
    .attr('stroke', '#888')
    .attr('stroke-width', 1)
    .attr('marker-end', 'url(#arrowhead)');
  
  const parse = d3.timeParse('%Y-%m-%d');

  COMMENTS.forEach(c => {
    // X => fecha única o centro del rango
    let x;
    if (c.date) {
      x = xScale(parse(c.date));
    } else if (c.dateRange && c.dateRange.length === 2) {
      const x1 = xScale(parse(c.dateRange[0]));
      const x2 = xScale(parse(c.dateRange[1]));
      x = (x1 + x2) / 2;
    }

    // Y => en eje izquierdo (fallecidos) o derecho (% vacunados)
    const yScale = c.yType === 'right' ? yRightScale : yLeftScale;
    const y = yScale(c.yValue);

    const g = svg.append('g').attr('class', `comment comment--${c.id}`);

    const lines = Array.isArray(c.text) ? c.text : [c.text];
    const xText = x + (c.dx || 0);
    const yText = y + (c.dy || 0);

    lines.forEach((line, i) => {
      g.append('text')
        .attr('x', xText)
        .attr('y', yText + i * 12)
        .attr('text-anchor', c.anchor || 'start')
        .attr('font-size', '9px')
        .attr('fill', '#888')
        .attr('opacity', 0.7)
        .text(line);
    });
  });
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
      addAnnotations(chartGroup, chartData, scales, config);
      }
  }, 250);

  window.addEventListener('resize', resizeChart);
}

/**
 * Initializes the chart
 */
export async function initChart() {
  try {
    // Set Spanish locale for D3
    d3.timeFormatDefaultLocale({
      "dateTime": "%A, %e de %B de %Y, %X",
      "date": "%d/%m/%Y",
      "time": "%H:%M:%S",
      "periods": ["AM", "PM"],
      "days": ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
      "shortDays": ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
      "months": ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
      "shortMonths": ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    });
    // Load data
    const rawData = await d3.csv('assets/data_factual.csv');

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
    addAnnotations(chartGroup, chartData, scales, config);

    // Setup responsiveness
    makeResponsive();

  } catch (error) {
    console.error('Error initializing chart:', error);
    d3.select('#chart-container').html(
      '<p class="error-message">Error cargando datos. Verificar que assets/data.csv existe.</p>'
    );
  }
}
