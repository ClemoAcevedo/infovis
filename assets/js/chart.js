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
import { initSound, onHoverPoint, updateSoundReferences, cleanupSound } from './sound.js';

// Global chart state
let chartSvg, chartGroup, scales, chartData;

// ===== ESTADO GLOBAL DEL ZOOM =====
let zoomBehavior = null;
let currentTransform = d3.zoomIdentity;
let originalXScale = null;

// ===== ESTADO GLOBAL DE FILTROS =====
let filterState = {
  vaccination: true,  // Vacunación visible por defecto
  deaths: true        // Fallecidos visible por defecto
};

// ===== ESTADO GLOBAL DEL TOOLTIP =====
let tooltipElements = {
  tooltip: null,        // Elemento HTML del tooltip
  guideline: null,      // Línea vertical de guía
  circleDeaths: null,   // Círculo destacado en línea de fallecidos
  circleVaccination: null  // Círculo destacado en línea de vacunación
};

let bisectDate = null;  // Bisector para encontrar punto de datos más cercano

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
    .domain([0, 250])
    .range([height, 0]);

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

  // Y-axes - set fixed tick values
  const yLeftAxis = d3.axisLeft(yLeftScale)
    .tickValues([0, 50, 100, 150, 200, 250]);

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

  // ===== CREAR GRUPO CON CLIP PATH =====
  const linesGroup = svg.append('g')
    .attr('class', 'lines-group')
    .attr('clip-path', 'url(#chart-clip)');

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

  // Draw deaths line (dentro del grupo con clip)
  linesGroup.append('path')
    .datum(data)
    .attr('class', 'line line--deaths')
    .attr('fill', 'none')
    .attr('stroke', COLORS.deaths)
    .attr('stroke-width', deathsStyle.strokeWidth)
    .attr('stroke-opacity', deathsStyle.strokeOpacity)
    .attr('d', deathsLine);

  // Draw vaccination line (dentro del grupo con clip)
  linesGroup.append('path')
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

  // ===== CREAR GRUPO CON CLIP PATH PARA HITOS =====
  const milestonesGroup = svg.append('g')
    .attr('class', 'milestones-group')
    .attr('clip-path', 'url(#chart-clip)');

  MILESTONES.forEach(milestone => {
    const milestoneDate = d3.timeParse('%Y-%m-%d')(milestone.date);
    const x = xScale(milestoneDate);

    if (x >= 0 && x <= width) {
      const labelText = Array.isArray(milestone.label) ? milestone.label.join(' ') : milestone.label;
      const milestoneGroup = milestonesGroup.append('g')
        .attr('class', `milestone-context contextual-element milestone-context--${milestone.style}`)
        .attr('data-context-date', milestone.date)
        .attr('data-context-type', 'milestone')
        .attr('data-context-label', labelText || '')
        .attr('transform', `translate(${x},0)`);

      // Create gradient effect with multiple dotted line segments
      const segments = 20; // Number of segments to create gradient effect
      const segmentHeight = height / segments;
      const dashPattern = milestone.dashArray.split(',').map(d => +d);
      const dashLength = dashPattern[0];
      const gapLength = dashPattern[1];
      const totalDashUnit = dashLength + gapLength;

      for (let i = 0; i < segments; i++) {
        const y1 = i * segmentHeight;
        const y2 = (i + 1) * segmentHeight;
        const opacity = 0.4 * (1 - i / segments); // Fade from 0.4 to 0

        if (opacity > 0.02) { // Only draw visible segments
          milestoneGroup.append('line')
            .attr('class', `milestone milestone--${milestone.style}`)
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', y1)
            .attr('y2', y2)
            .attr('stroke', COLORS.milestone[milestone.style])
            .attr('stroke-width', milestone.strokeWidth)
            .attr('stroke-dasharray', milestone.dashArray)
            .attr('stroke-opacity', opacity)
            .attr('stroke-dashoffset', -(y1 % totalDashUnit)); // Align dashes
        }
      }

      // Add milestone label with arrow pointing down
      const labelGroup = milestoneGroup.append('g')
        .attr('class', 'milestone-label')
        .attr('transform', `translate(0, ${milestone.yOffset})`);

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
    // Deaths line label - position in top left corner
    const deathsLabelGroup = svg.append('g').attr('class', 'direct-label deaths-label');

    deathsLabelGroup.append('text')
      .attr('x', 5) // Position at the left edge with small padding
      .attr('y', 15) // Position at the top with small padding
      .attr('fill', COLORS.deaths)
      .attr('text-anchor', 'start')
      .style('font-size', '12px')
      .style('font-weight', '500')
      .text(CONTENT.labels.deaths);

    const labelX = width - 5; // Position at the right edge

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

  // ===== CREAR GRUPO CON CLIP PATH PARA ANOTACIONES =====
  const annotationsGroup = svg.append('g')
    .attr('class', 'annotations-group')
    .attr('clip-path', 'url(#chart-clip)');

  // Add Omicron annotation - less visible and properly positioned
  const omicronDate = d3.timeParse('%Y-%m-%d')(CONTENT.omicronAnnotation.date);
  const omicronX = xScale(omicronDate);

  // Find the actual deaths value at the peak to position annotation correctly
  const omicronData = data.find(d => d3.timeFormat('%Y-%m-%d')(d.date) === CONTENT.omicronAnnotation.date);
  const omicronDeathsY = omicronData ? yLeftScale(omicronData.deaths_7d) : height * 0.3;
  const omicronY = omicronDeathsY - 3; // Position text closer to the peak for better arrow connection

  const omicronGroup = annotationsGroup.append('g')
    .attr('class', 'omicron-annotation contextual-element')
    .attr('data-context-date', CONTENT.omicronAnnotation.date)
    .attr('data-context-type', 'annotation')
    .attr('data-context-label', Array.isArray(CONTENT.omicronAnnotation.text) ? CONTENT.omicronAnnotation.text.join(' ') : CONTENT.omicronAnnotation.text || '')
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

    const commentDate = c.date || (Array.isArray(c.dateRange) && c.dateRange.length > 0 ? c.dateRange[Math.floor(c.dateRange.length / 2)] : null);
    const lines = Array.isArray(c.text) ? c.text : [c.text];
    const contextLabel = lines.join(' ');

    const g = annotationsGroup.append('g')
      .attr('class', `comment comment--${c.id} contextual-element`)
      .attr('data-context-date', commentDate || '')
      .attr('data-context-type', 'comment')
      .attr('data-context-label', contextLabel);
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

      // Recrear clip path tras resize
      svg.append('defs').append('clipPath')
        .attr('id', 'chart-clip')
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', config.width)
        .attr('height', config.height);

      scales = buildScales(chartData, config);
      originalXScale = scales.xScale.copy(); // Guardar escala X original tras resize
      drawAxes(chartGroup, scales, config);
      drawLines(chartGroup, chartData, scales, config);
      addMilestones(chartGroup, scales, config);
      addDirectLabels(chartGroup, chartData, scales, config);
      addAnnotations(chartGroup, chartData, scales, config);

      // Reinicializar zoom después de resize
      setupZoom(svg, config);

      // Reinicializar tooltip después de resize
      setupTooltip(chartGroup, config);

      // Mantener estado de filtros tras resize
      updateSeriesVisibility();
      }
  }, 250);

  window.addEventListener('resize', resizeChart);
}

// ===== CONFIGURACIÓN DE FILTROS =====
/**
 * Actualiza la visibilidad de las series según el estado de los filtros
 */
function updateSeriesVisibility() {
  const vaccinationLine = chartGroup.select('.lines-group .line--vaccination');
  const deathsLine = chartGroup.select('.lines-group .line--deaths');
  const vaccinationLabel = chartGroup.select('.direct-label.vaccination-label');
  const deathsLabel = chartGroup.select('.direct-label.deaths-label');
  const noDataMessage = d3.select('#no-data-message');

  // ===== ACTUALIZACIÓN DE VISIBILIDAD CON TRANSICIONES =====
  // Línea de vacunación
  if (filterState.vaccination) {
    vaccinationLine
      .transition()
      .duration(500)
      .style('opacity', 1)
      .style('stroke-width', LINE_STYLES.vaccination.strokeWidth);

    vaccinationLabel
      .transition()
      .duration(500)
      .style('opacity', 1);

    console.log('✅ Serie reactivada: vacunación');
  } else {
    vaccinationLine
      .transition()
      .duration(500)
      .style('opacity', 0.1)
      .style('stroke-width', 0.5);

    vaccinationLabel
      .transition()
      .duration(500)
      .style('opacity', 0.3);

    console.log('❌ Serie oculta: vacunación');
  }

  // Línea de fallecidos
  if (filterState.deaths) {
    const mobile = isMobile(BREAKPOINTS.mobile);
    const deathsStyle = getResponsiveLineStyle(
      LINE_STYLES.deaths,
      LINE_STYLES.mobile.deaths,
      mobile
    );

    deathsLine
      .transition()
      .duration(500)
      .style('opacity', 1)
      .style('stroke-width', deathsStyle.strokeWidth);

    deathsLabel
      .transition()
      .duration(500)
      .style('opacity', 1);

    console.log('✅ Serie reactivada: fallecidos');
  } else {
    deathsLine
      .transition()
      .duration(500)
      .style('opacity', 0.1)
      .style('stroke-width', 0.5);

    deathsLabel
      .transition()
      .duration(500)
      .style('opacity', 0.3);

    console.log('❌ Serie oculta: fallecidos');
  }

  // ===== MANEJO DE CASO: AMBOS FILTROS DESACTIVADOS =====
  if (!filterState.vaccination && !filterState.deaths) {
    noDataMessage.style('display', 'block');
    console.log('⚠️ Advertencia: No hay series visibles. Mostrando mensaje al usuario.');
  } else {
    noDataMessage.style('display', 'none');
  }

  // ===== ACTUALIZAR REFERENCIAS DE SONIFICACIÓN =====
  updateSoundReferences(scales, filterState);
}

/**
 * Configura los filtros de series
 */
function setupFilters() {
  // ===== EVENTOS DE CHECKBOX =====
  const vaccinationCheckbox = document.getElementById('filter-vaccination');
  const deathsCheckbox = document.getElementById('filter-deaths');

  if (vaccinationCheckbox) {
    vaccinationCheckbox.addEventListener('change', (event) => {
      filterState.vaccination = event.target.checked;
      console.log(`📊 Filtro de vacunación: ${filterState.vaccination ? 'activado' : 'desactivado'}`);
      updateSeriesVisibility();
    });
  }

  if (deathsCheckbox) {
    deathsCheckbox.addEventListener('change', (event) => {
      filterState.deaths = event.target.checked;
      console.log(`📊 Filtro de fallecidos: ${filterState.deaths ? 'activado' : 'desactivado'}`);
      updateSeriesVisibility();
    });
  }

  console.log('✅ Sistema de filtros inicializado correctamente');
}

// ===== CONFIGURACIÓN DE TOOLTIP (DETAILS ON DEMAND) =====
/**
 * Encuentra el punto de datos más cercano a una fecha dada
 * @param {Date} fecha - Fecha para buscar
 * @returns {Object} Punto de datos más cercano
 */
function encontrarPuntoCercano(fecha) {
  const i = bisectDate(chartData, fecha, 1);
  const d0 = chartData[i - 1];
  const d1 = chartData[i];

  // Determinar cuál punto está más cerca
  if (!d1) return d0;
  if (!d0) return d1;

  return fecha - d0.date > d1.date - fecha ? d1 : d0;
}

/**
 * Actualiza la posición y contenido del tooltip
 * @param {Object} event - Evento del mouse
 * @param {Object} config - Configuración del gráfico
 */
function actualizarTooltip(event, config) {
  // ===== OBTENER COORDENADAS DEL MOUSE =====
  const [mouseX] = d3.pointer(event, chartGroup.node());

  // Verificar que el mouse está dentro del área del gráfico
  if (mouseX < 0 || mouseX > config.width) {
    ocultarTooltip();
    return;
  }

  // ===== INVERTIR ESCALA X PARA OBTENER FECHA =====
  const xScale = scales.xScale;
  const fechaActual = xScale.invert(mouseX);

  // ===== ENCONTRAR PUNTO DE DATOS MÁS CERCANO =====
  const punto = encontrarPuntoCercano(fechaActual);

  if (!punto) {
    ocultarTooltip();
    return;
  }

  // ===== LOG DE DEBUG EN ESPAÑOL =====
  console.log('📍 Fecha bajo el cursor:',
    d3.timeFormat('%d/%m/%Y')(punto.date),
    '| Fallecidos:', Math.round(punto.deaths_7d),
    '| Vacunación:', punto.vaccinated_pct.toFixed(1) + '%'
  );

  // ===== SONIFICACIÓN: reproducir sonido del punto =====
  onHoverPoint(punto);

  // ===== ACTUALIZAR POSICIÓN DE LA LÍNEA GUÍA =====
  const xPos = xScale(punto.date);
  tooltipElements.guideline
    .attr('x1', xPos)
    .attr('x2', xPos)
    .attr('y1', 0)
    .attr('y2', config.height)
    .style('opacity', 0.5);

  // ===== ACTUALIZAR CÍRCULOS DESTACADOS =====
  // Círculo de fallecidos (solo si está visible)
  if (filterState.deaths) {
    const yDeaths = scales.yLeftScale(punto.deaths_7d);
    tooltipElements.circleDeaths
      .attr('cx', xPos)
      .attr('cy', yDeaths)
      .style('opacity', 1);
  } else {
    tooltipElements.circleDeaths.style('opacity', 0);
  }

  // Círculo de vacunación (solo si está visible)
  if (filterState.vaccination) {
    const yVaccination = scales.yRightScale(punto.vaccinated_pct);
    tooltipElements.circleVaccination
      .attr('cx', xPos)
      .attr('cy', yVaccination)
      .style('opacity', 1);
  } else {
    tooltipElements.circleVaccination.style('opacity', 0);
  }

  // ===== ACTUALIZAR CONTENIDO DEL TOOLTIP =====
  const formatoFecha = d3.timeFormat('%d %B %Y');
  const fechaFormateada = formatoFecha(punto.date);

  tooltipElements.tooltip.select('.tooltip-date')
    .text(fechaFormateada);

  // Mostrar fallecidos solo si el filtro está activo
  if (filterState.deaths) {
    tooltipElements.tooltip.select('.tooltip-deaths')
      .style('display', 'flex')
      .html(`<span>Fallecidos:</span><span>${Math.round(punto.deaths_7d)}</span>`);
  } else {
    tooltipElements.tooltip.select('.tooltip-deaths')
      .style('display', 'none');
  }

  // Mostrar vacunación solo si el filtro está activo
  if (filterState.vaccination) {
    tooltipElements.tooltip.select('.tooltip-vaccination')
      .style('display', 'flex')
      .html(`<span>Cobertura vacunación:</span><span>${punto.vaccinated_pct.toFixed(1)}%</span>`);
  } else {
    tooltipElements.tooltip.select('.tooltip-vaccination')
      .style('display', 'none');
  }

  // ===== POSICIONAR TOOLTIP CERCA DEL CURSOR =====
  const containerRect = document.getElementById('chart-container').getBoundingClientRect();
  const tooltipNode = tooltipElements.tooltip.node();
  const tooltipWidth = tooltipNode.offsetWidth;
  const tooltipHeight = tooltipNode.offsetHeight;

  // Calcular posición del tooltip (evitar que se salga del contenedor)
  let tooltipX = event.pageX - containerRect.left + 15;
  let tooltipY = event.pageY - containerRect.top - tooltipHeight - 10;

  // Ajustar si se sale por la derecha
  if (tooltipX + tooltipWidth > containerRect.width) {
    tooltipX = event.pageX - containerRect.left - tooltipWidth - 15;
  }

  // Ajustar si se sale por arriba
  if (tooltipY < 0) {
    tooltipY = event.pageY - containerRect.top + 20;
  }

  tooltipElements.tooltip
    .style('display', 'block')
    .style('left', tooltipX + 'px')
    .style('top', tooltipY + 'px');
}

/**
 * Oculta el tooltip y elementos visuales
 */
function ocultarTooltip() {
  tooltipElements.tooltip
    .style('display', 'none');

  tooltipElements.guideline
    .style('opacity', 0);

  tooltipElements.circleDeaths
    .style('opacity', 0);

  tooltipElements.circleVaccination
    .style('opacity', 0);

  console.log('👻 Tooltip ocultado');
}

/**
 * Configura el sistema de tooltip con capa de interacción
 * @param {Object} svg - Grupo SVG del gráfico
 * @param {Object} config - Configuración del gráfico
 */
function setupTooltip(svg, config) {
  // ===== INICIALIZAR BISECTOR =====
  bisectDate = d3.bisector(d => d.date).left;

  // ===== SELECCIONAR TOOLTIP HTML =====
  tooltipElements.tooltip = d3.select('#chart-tooltip');

  // ===== CREAR ELEMENTOS VISUALES EN SVG =====
  // Línea vertical de guía
  tooltipElements.guideline = svg.append('line')
    .attr('class', 'tooltip-guideline')
    .style('stroke', '#666')
    .style('stroke-width', 1)
    .style('stroke-dasharray', '3,3')
    .style('opacity', 0)
    .style('pointer-events', 'none');

  // Círculo destacado para fallecidos
  tooltipElements.circleDeaths = svg.append('circle')
    .attr('class', 'tooltip-circle-deaths')
    .attr('r', 4)
    .style('fill', COLORS.deaths)
    .style('stroke', 'white')
    .style('stroke-width', 2)
    .style('opacity', 0)
    .style('pointer-events', 'none');

  // Círculo destacado para vacunación
  tooltipElements.circleVaccination = svg.append('circle')
    .attr('class', 'tooltip-circle-vaccination')
    .attr('r', 4)
    .style('fill', COLORS.vaccination)
    .style('stroke', 'white')
    .style('stroke-width', 2)
    .style('opacity', 0)
    .style('pointer-events', 'none');

  // ===== CREAR CAPA DE INTERACCIÓN INVISIBLE =====
  const interactionLayer = svg.append('rect')
    .attr('class', 'interaction-layer')
    .attr('width', config.width)
    .attr('height', config.height)
    .style('fill', 'none')
    .style('pointer-events', 'all');

  // ===== EVENTOS DE MOUSE =====
  interactionLayer
    .on('mousemove', (event) => actualizarTooltip(event, config))
    .on('mouseleave', () => {
      ocultarTooltip();
      console.log('🚪 Mouse salió del área del gráfico');
    })
    .on('click', (event) => {
      // Click también actualiza tooltip (útil en dispositivos táctiles)
      actualizarTooltip(event, config);
      console.log('👆 Click en el gráfico - tooltip actualizado');
    });

  console.log('✅ Sistema de tooltip (details on demand) inicializado correctamente');
}

// ===== CONFIGURACIÓN DE ZOOM =====
/**
 * Función que se ejecuta cuando se hace zoom/pan
 * @param {Object} event - Evento de D3 zoom
 */
function zoomed(event, config) {
  // Guardar el transform actual
  currentTransform = event.transform;

  // Crear nueva escala X transformada (solo horizontal)
  const newXScale = currentTransform.rescaleX(originalXScale);

  // Actualizar dominio de la escala X
  scales.xScale = newXScale;

  // ===== ACTUALIZACIÓN DE EJES =====
  // Actualizar eje X con la nueva escala
  const xAxis = d3.axisBottom(newXScale)
    .ticks(getTickCount(isMobile(BREAKPOINTS.mobile)))
    .tickFormat(formatAxisDate);

  chartGroup.select('.axis--x').call(xAxis);

  // ===== ACTUALIZACIÓN DE LÍNEAS =====
  // Actualizar línea de fallecidos
  const deathsLine = d3.line()
    .x(d => newXScale(d.date))
    .y(d => scales.yLeftScale(d.deaths_7d))
    .curve(d3.curveMonotoneX)
    .defined(d => d.date && !isNaN(d.deaths_7d) && isFinite(d.deaths_7d));

  chartGroup.select('.lines-group .line--deaths')
    .attr('d', deathsLine(chartData));

  // Actualizar línea de vacunación
  const vaccinationLine = d3.line()
    .x(d => newXScale(d.date))
    .y(d => scales.yRightScale(d.vaccinated_pct))
    .curve(d3.curveMonotoneX)
    .defined(d => d.date && !isNaN(d.vaccinated_pct) && isFinite(d.vaccinated_pct));

  chartGroup.select('.lines-group .line--vaccination')
    .attr('d', vaccinationLine(chartData));

  // ===== ACTUALIZACIÓN DE HITOS (MILESTONES) =====
  const parse = d3.timeParse('%Y-%m-%d');

  chartGroup.selectAll('.milestones-group').remove();

  // Recrear grupo de hitos con clip path
  const milestonesGroup = chartGroup.append('g')
    .attr('class', 'milestones-group')
    .attr('clip-path', 'url(#chart-clip)');

  MILESTONES.forEach(milestone => {
    const milestoneDate = parse(milestone.date);
    const x = newXScale(milestoneDate);

    if (x >= 0 && x <= config.width) {
      const labelText = Array.isArray(milestone.label) ? milestone.label.join(' ') : milestone.label;
      const milestoneGroup = milestonesGroup.append('g')
        .attr('class', `milestone-context contextual-element milestone-context--${milestone.style}`)
        .attr('data-context-date', milestone.date)
        .attr('data-context-type', 'milestone')
        .attr('data-context-label', labelText || '')
        .attr('transform', `translate(${x},0)`);

      // Redibujar líneas de hitos
      const segments = 20;
      const segmentHeight = config.height / segments;
      const dashPattern = milestone.dashArray.split(',').map(d => +d);
      const totalDashUnit = dashPattern[0] + dashPattern[1];

      for (let i = 0; i < segments; i++) {
        const y1 = i * segmentHeight;
        const y2 = (i + 1) * segmentHeight;
        const opacity = 0.4 * (1 - i / segments);

        if (opacity > 0.02) {
          milestoneGroup.append('line')
            .attr('class', `milestone milestone--${milestone.style}`)
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', y1)
            .attr('y2', y2)
            .attr('stroke', COLORS.milestone[milestone.style])
            .attr('stroke-width', milestone.strokeWidth)
            .attr('stroke-dasharray', milestone.dashArray)
            .attr('stroke-opacity', opacity)
            .attr('stroke-dashoffset', -(y1 % totalDashUnit));
        }
      }

      // Redibujar etiquetas de hitos
      const labelGroup = milestoneGroup.append('g')
        .attr('class', 'milestone-label')
        .attr('transform', `translate(0, ${milestone.yOffset})`);

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

      const arrowYStart = Array.isArray(milestone.label) ? milestone.label.length * 12 + 3 : 8;
      labelGroup.append('line')
        .attr('x1', 0)
        .attr('y1', arrowYStart)
        .attr('x2', 0)
        .attr('y2', arrowYStart + 10)
        .attr('stroke', '#666')
        .attr('stroke-width', 1)
        .attr('marker-end', 'url(#milestone-arrow)');
    }
  });

  // ===== ACTUALIZACIÓN DE ANOTACIONES =====
  chartGroup.selectAll('.annotations-group').remove();

  // Recrear grupo de anotaciones con clip path
  const annotationsGroup = chartGroup.append('g')
    .attr('class', 'annotations-group')
    .attr('clip-path', 'url(#chart-clip)');

  // Redibujar anotación de Ómicron
  const omicronDate = parse(CONTENT.omicronAnnotation.date);
  const omicronX = newXScale(omicronDate);

  if (omicronX >= 0 && omicronX <= config.width) {
    const omicronData = chartData.find(d => d3.timeFormat('%Y-%m-%d')(d.date) === CONTENT.omicronAnnotation.date);
    const omicronDeathsY = omicronData ? scales.yLeftScale(omicronData.deaths_7d) : config.height * 0.3;
    const omicronY = omicronDeathsY - 3;

    const omicronGroup = annotationsGroup.append('g')
      .attr('class', 'omicron-annotation contextual-element')
      .attr('data-context-date', CONTENT.omicronAnnotation.date)
      .attr('data-context-type', 'annotation')
      .attr('data-context-label', Array.isArray(CONTENT.omicronAnnotation.text) ? CONTENT.omicronAnnotation.text.join(' ') : CONTENT.omicronAnnotation.text || '')
      .attr('opacity', 0.6);

    if (Array.isArray(CONTENT.omicronAnnotation.text)) {
      CONTENT.omicronAnnotation.text.forEach((line, index) => {
        omicronGroup.append('text')
          .attr('x', omicronX + 35)
          .attr('y', omicronY + (index * 12))
          .attr('fill', '#888')
          .attr('font-size', '10px')
          .attr('font-weight', '400')
          .attr('text-anchor', 'start')
          .text(line);
      });
    }

    const arrowY = omicronDeathsY;
    omicronGroup.append('line')
      .attr('x1', omicronX + 35)
      .attr('y1', arrowY)
      .attr('x2', omicronX)
      .attr('y2', arrowY)
      .attr('stroke', '#888')
      .attr('stroke-width', 1)
      .attr('marker-end', 'url(#arrowhead)');
  }

  // Redibujar comentarios
  COMMENTS.forEach(c => {
    let x;
    if (c.date) {
      x = newXScale(parse(c.date));
    } else if (c.dateRange && c.dateRange.length === 2) {
      const x1 = newXScale(parse(c.dateRange[0]));
      const x2 = newXScale(parse(c.dateRange[1]));
      x = (x1 + x2) / 2;
    }

    if (x >= -50 && x <= config.width + 50) {
      const yScale = c.yType === 'right' ? scales.yRightScale : scales.yLeftScale;
      const y = yScale(c.yValue);

      const lines = Array.isArray(c.text) ? c.text : [c.text];
      const commentDate = c.date || (Array.isArray(c.dateRange) && c.dateRange.length > 0 ? c.dateRange[Math.floor(c.dateRange.length / 2)] : null);
      const contextLabel = lines.join(' ');

      const g = annotationsGroup.append('g')
        .attr('class', `comment comment--${c.id} contextual-element`)
        .attr('data-context-date', commentDate || '')
        .attr('data-context-type', 'comment')
        .attr('data-context-label', contextLabel);

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
    }
  });

  // ===== LOG EN ESPAÑOL =====
  const dominio = newXScale.domain();
  const formatoFecha = d3.timeFormat('%d/%m/%Y');
  console.log('🔍 Zoom actualizado. Fechas visibles:',
    formatoFecha(dominio[0]), '→', formatoFecha(dominio[1]));

  // ===== MANTENER ESTADO DE FILTROS TRAS ZOOM =====
  // Aplicar visibilidad de filtros después de redibujar
  updateSeriesVisibility();

  // ===== ACTUALIZAR REFERENCIAS DE SONIFICACIÓN TRAS ZOOM =====
  updateSoundReferences(scales, filterState);
}

/**
 * Configura el comportamiento de zoom en el gráfico
 * @param {Object} svg - Selección SVG de D3
 * @param {Object} config - Configuración del gráfico
 */
function setupZoom(svg, config) {
  // ===== CREAR COMPORTAMIENTO DE ZOOM =====
  zoomBehavior = d3.zoom()
    .scaleExtent([1, 20]) // Límites de zoom: 1x (sin zoom) a 20x
    .translateExtent([[0, 0], [config.width, config.height]]) // Limitar paneo
    .extent([[0, 0], [config.width, config.height]])
    .filter(function(event) {
      // Permitir zoom con rueda del mouse y paneo con arrastre
      // Solo modificar el eje X (horizontal)
      return event.type !== 'dblclick'; // Desactivar doble click para zoom
    })
    .on('zoom', (event) => zoomed(event, config))
    .on('start', function() {
      // Cambiar cursor a "grabbing" durante el paneo
      d3.select('#chart-container').classed('grabbing', true);
    })
    .on('end', function() {
      // Restaurar cursor después del paneo
      d3.select('#chart-container').classed('grabbing', false);
    });

  // Aplicar zoom al grupo del gráfico
  svg.call(zoomBehavior);

  // Añadir clase para cursor "grab"
  d3.select('#chart-container').classed('grabbable', true);

  // ===== FUNCIÓN PARA RESETEAR VISTA =====
  const resetButton = document.getElementById('reset-zoom-btn');
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      console.log('🔄 Reseteando vista al rango completo de fechas');

      // Resetear transform y redibujar
      svg.transition()
        .duration(750)
        .call(zoomBehavior.transform, d3.zoomIdentity);
    });
  }

  console.log('✅ Sistema de zoom/pan inicializado correctamente');
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

    // ===== CREAR CLIP PATH PARA LIMITAR EL ÁREA DE DIBUJO =====
    chartSvg.append('defs').append('clipPath')
      .attr('id', 'chart-clip')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', config.width)
      .attr('height', config.height);

    // Build chart
    scales = buildScales(chartData, config);
    originalXScale = scales.xScale.copy(); // Guardar escala X original para zoom
    drawAxes(chartGroup, scales, config);
    drawLines(chartGroup, chartData, scales, config);
    addMilestones(chartGroup, scales, config);
    addDirectLabels(chartGroup, chartData, scales, config);
    addAnnotations(chartGroup, chartData, scales, config);

    // ===== CONFIGURAR ZOOM/PAN =====
    setupZoom(chartSvg, config);

    // ===== CONFIGURAR FILTROS =====
    setupFilters();

    // ===== CONFIGURAR TOOLTIP =====
    setupTooltip(chartGroup, config);

    // ===== CONFIGURAR SONIFICACIÓN =====
    initSound(chartData, filterState, scales, chartGroup);

    // Setup responsiveness
    makeResponsive();

  } catch (error) {
    console.error('Error initializing chart:', error);
    d3.select('#chart-container').html(
      '<p class="error-message">Error cargando datos. Verificar que assets/data.csv existe.</p>'
    );
  }
}
