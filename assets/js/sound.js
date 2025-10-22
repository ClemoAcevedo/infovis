/**
 * Módulo de sonificación de datos para COVID-19 Chile
 * Convierte valores cuantitativos en feedback auditivo
 */

import { resetZoom, zoomToNarrativeStart, setFiltersLocked } from './chart.js';

// ===== CONFIGURACIÓN DE AUDIO =====
let audioContext = null;
let heartbeatLowSynth = null;    // Sintetizador grave para el golpe 'lub'
let heartbeatHighSynth = null;   // Sintetizador agudo para el golpe 'dub'
let heartbeatCompressor = null;  // Compresor para dar cohesión al latido
let heartbeatReverb = null;      // Reverb ligera para sensación orgánica
let isAudioInitialized = false;
let isPlaying = false;
let playbackInterval = null;
let playbackStartDate = null;
let currentBpm = 60; // BPM actual para suavizado de transiciones

const PLAY_LABEL_DEFAULT = '▶ Sonificación';
const PLAY_LABEL_STOP = '⏸ Detener';
const PLAY_LABEL_DISABLED = '✕ Solo sin filtros';
const NARRATIVE_LABEL_DEFAULT = '📖 Narrativa';
const NARRATIVE_LABEL_STOP = '⏸ Detener';
const NARRATIVE_LABEL_DISABLED = '✕ Solo sin filtros';
const VACCINATION_COLOR = '#1f77b4';
const MAX_PLAYBACK_DURATION_SECONDS = 60; // Duración máxima de la reproducción en segundos
const SMOOTHING_WINDOW = 7; // Ventana para media móvil (debe ser impar)

// ===== ESCALAS DE MAPEO DE DATOS A SONIDO =====
let escalaLatidos = null;      // Escala: fallecidos → BPM aproximado del latido

// ===== REFERENCIAS A ELEMENTOS DEL DOM =====
let playButton = null;
let progressIndicator = null;

// ===== ESTADO GLOBAL DEL CHART (se importará desde chart.js) =====
let chartData = null;
let filterState = null;
let scales = null;
let chartGroup = null;
let deathsMarker = null;
let vaccinationMarker = null;
let isNarrativeMode = false; // Flag para modo narrativa
let isNarrativePlaybackActive = false; // Flag para saber si la narrativa inició la reproducción
let chartContainerElement = null;
let deathsHighlightPath = null;
let vaccinationHighlightPath = null;
let originalDeathsStroke = null;
let originalDeathsStrokeWidth = null;
let originalDeathsStrokeOpacity = null;
let originalDeathsStyleOpacity = null;
let originalVaccinationStroke = null;
let originalVaccinationStrokeWidth = null;
let originalVaccinationStrokeOpacity = null;
let originalVaccinationStyleOpacity = null;
let contextElements = [];
let lastPlaybackDate = null;
let contextDateParser = null;
let centerOnDateCallback = null;

function ensureChartContainer() {
  if (!chartContainerElement) {
    chartContainerElement = document.getElementById('chart-container');
  }
  return chartContainerElement;
}

function ensureHighlightPath() {
  if (!chartGroup || typeof chartGroup.select !== 'function') {
    return null;
  }

  if (deathsHighlightPath && typeof deathsHighlightPath.empty === 'function' && deathsHighlightPath.empty()) {
    deathsHighlightPath = null;
  }

  if (!deathsHighlightPath) {
    const linesGroup = chartGroup.select('.lines-group');
    const target = linesGroup && typeof linesGroup.empty === 'function' && !linesGroup.empty() ? linesGroup : chartGroup;

    deathsHighlightPath = target.append('path')
      .attr('class', 'sonification-highlight')
      .attr('fill', 'none')
      .attr('stroke', '#ff5f5f')
      .attr('stroke-width', 1.8)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .style('opacity', 0)
      .style('pointer-events', 'none');
  }

  return deathsHighlightPath;
}

function ensureVaccinationHighlightPath() {
  if (!chartGroup || typeof chartGroup.select !== 'function') {
    return null;
  }

  if (vaccinationHighlightPath && typeof vaccinationHighlightPath.empty === 'function' && vaccinationHighlightPath.empty()) {
    vaccinationHighlightPath = null;
  }

  if (!vaccinationHighlightPath) {
    const linesGroup = chartGroup.select('.lines-group');
    const target = linesGroup && typeof linesGroup.empty === 'function' && !linesGroup.empty() ? linesGroup : chartGroup;

    vaccinationHighlightPath = target.append('path')
      .attr('class', 'sonification-highlight sonification-highlight--vaccination')
      .attr('fill', 'none')
      .attr('stroke', VACCINATION_COLOR)
      .attr('stroke-width', 1.8)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .style('opacity', 0)
      .style('pointer-events', 'none');
  }

  return vaccinationHighlightPath;
}


function hideDeathsHighlightPath() {
  if (deathsHighlightPath && typeof deathsHighlightPath.style === 'function') {
    deathsHighlightPath
      .style('opacity', 0)
      .attr('d', null);
  }
}

function hideVaccinationHighlightPath() {
  if (vaccinationHighlightPath && typeof vaccinationHighlightPath.style === 'function') {
    vaccinationHighlightPath
      .style('opacity', 0)
      .attr('d', null);
  }
}

function hideHighlightPath() {
  hideDeathsHighlightPath();
  hideVaccinationHighlightPath();
}

function ensureDeathsMarker() {
  const container = ensureChartContainer();
  if (container && !deathsMarker) {
    deathsMarker = document.createElement('div');
    deathsMarker.className = 'sound-deaths-marker';
    deathsMarker.style.opacity = '0';
    deathsMarker.style.transform = 'translate(-50%, -50%) scale(0.9)';
    container.appendChild(deathsMarker);
  }
  return deathsMarker;
}

function hideDeathsMarker() {
  if (deathsMarker) {
    deathsMarker.style.opacity = '0';
    deathsMarker.style.transform = 'translate(-50%, -50%) scale(0.9)';
    deathsMarker.classList.remove('sound-deaths-marker--pulse');
  }
  hideHighlightPath();
}

function triggerDeathsMarkerPulse() {
  const marker = ensureDeathsMarker();
  if (!marker) {
    return;
  }

  marker.classList.remove('sound-deaths-marker--pulse');
  // Force reflow so animation can restart on consecutive notes
  void marker.offsetWidth;
  marker.classList.add('sound-deaths-marker--pulse');
}

/**
 * Calcula la variabilidad (importancia narrativa) de un segmento de datos
 * Combina desviación estándar con rango para capturar tanto variabilidad como picos
 * @param {Array} segment - Segmento de datos
 * @returns {Number} Puntuación de variabilidad
 */
function calcularVariabilidad(segment) {
  if (!segment || segment.length < 2) {
    return 0;
  }

  const values = segment.map(p => p.deaths_7d || 0).filter(v => isFinite(v));
  if (values.length < 2) {
    return 0;
  }

  // Calcular media
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

  // Calcular desviación estándar (qué tan dispersos están los valores)
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Calcular rango (diferencia entre máximo y mínimo)
  const range = Math.max(...values) - Math.min(...values);

  // Combinar ambas métricas enfatizando MUCHO MÁS los cambios bruscos (range)
  // range captura picos dramáticos, que son los momentos más importantes de la narrativa
  return stdDev * 0.3 + range * 0.7;
}

/**
 * Procesa los datos para sonificación con distribución inteligente del tiempo:
 * - Tramos con poca variación → menos puntos (pasar rápido)
 * - Tramos con mucha variación → más puntos (apreciar cambios dramáticos)
 * @param {Array} data - Datos originales visibles
 * @returns {Array} Datos procesados para sonificación
 */
function prepararDatosParaSonido(data) {
  if (!data || data.length === 0) {
    return [];
  }

  // 1. Aplicar media móvil para suavizar la curva
  const halfWindow = Math.floor(SMOOTHING_WINDOW / 2);
  const smoothedData = data.map((punto, i) => {
    const start = Math.max(0, i - halfWindow);
    const end = Math.min(data.length, i + halfWindow + 1);
    const window = data.slice(start, end);

    const avgDeaths = window.reduce((sum, p) => sum + (p.deaths_7d || 0), 0) / window.length;

    return {
      ...punto,
      deaths_7d_smooth: avgDeaths,
      deaths_7d_original: punto.deaths_7d
    };
  });

  // 2. Dividir en segmentos para analizar variabilidad
  const numSegments = Math.min(20, Math.floor(smoothedData.length / 5)); // ~20 segmentos
  const segmentSize = Math.floor(smoothedData.length / numSegments);
  const segments = [];

  for (let i = 0; i < numSegments; i++) {
    const start = i * segmentSize;
    const end = i === numSegments - 1 ? smoothedData.length : (i + 1) * segmentSize;
    const segment = smoothedData.slice(start, end);
    const variabilidad = calcularVariabilidad(segment);

    segments.push({
      start,
      end,
      data: segment,
      variabilidad,
      puntos: 0  // Se calculará después
    });
  }

  // 3. Calcular puntos a asignar a cada segmento basado en variabilidad
  const targetPoints = 120; // ~60 segundos con BPM promedio ~120
  const totalVariabilidad = segments.reduce((sum, s) => sum + s.variabilidad, 0);

  // Asignar puntos proporcionalmente a la variabilidad AMPLIFICADA
  // Usar escala power para que segmentos muy variables reciban MUCHO más tiempo
  let puntosAsignados = 0;
  const minPuntosPorSegmento = 2; // Mínimo aumentado para 60 segundos

  segments.forEach(seg => {
    if (totalVariabilidad === 0) {
      // Si no hay variabilidad, distribuir uniformemente
      seg.puntos = Math.floor(targetPoints / numSegments);
    } else {
      // Calcular proporción y AMPLIFICARLA con power (exponente 1.5)
      // Esto hace que segmentos con 2x variabilidad reciban ~2.8x puntos
      const proporcion = seg.variabilidad / totalVariabilidad;
      const proporcionAmplificada = Math.pow(proporcion, 0.7); // Exponente < 1 amplifica diferencias

      // Normalizar para que la suma sea 1
      const sumaProporciones = segments.reduce((sum, s) =>
        sum + Math.pow(s.variabilidad / totalVariabilidad, 0.7), 0);

      const proporcionNormalizada = proporcionAmplificada / sumaProporciones;
      seg.puntos = Math.max(minPuntosPorSegmento, Math.floor(targetPoints * proporcionNormalizada));
    }
    puntosAsignados += seg.puntos;
  });

  // Ajustar si nos pasamos o faltamos puntos
  const diferencia = targetPoints - puntosAsignados;
  if (diferencia !== 0 && segments.length > 0) {
    // Dar puntos extra al segmento con mayor variabilidad
    // IMPORTANTE: Encontrar el índice sin reordenar el array
    let maxVariabilidadIdx = 0;
    let maxVariabilidad = segments[0].variabilidad;

    for (let i = 1; i < segments.length; i++) {
      if (segments[i].variabilidad > maxVariabilidad) {
        maxVariabilidad = segments[i].variabilidad;
        maxVariabilidadIdx = i;
      }
    }

    segments[maxVariabilidadIdx].puntos += diferencia;
  }

  // 4. Extraer puntos de cada segmento según su asignación
  // MANTENER ORDEN CRONOLÓGICO: iterar en el orden original de los segmentos
  const reducedData = [];

  segments.forEach(seg => {
    if (seg.puntos <= 0 || seg.data.length === 0) {
      return;
    }

    const step = seg.data.length / seg.puntos;

    for (let i = 0; i < seg.puntos; i++) {
      const index = Math.floor(i * step);
      if (index < seg.data.length) {
        reducedData.push(seg.data[index]);
      }
    }
  });

  console.log(`🎵 Dataset procesado con distribución inteligente:`);
  console.log(`   ${data.length} → ${reducedData.length} puntos en ~60 segundos`);
  console.log(`   Segmentos analizados: ${numSegments}`);

  // Logging detallado de asignación
  const highVariability = segments.filter(s => s.variabilidad > totalVariabilidad / numSegments).length;
  console.log(`   Segmentos de alta variabilidad: ${highVariability}/${numSegments} (más tiempo dedicado)`);

  // Mostrar los 3 segmentos con más puntos asignados
  const topSegments = [...segments].sort((a, b) => b.puntos - a.puntos).slice(0, 3);
  console.log(`   Top 3 segmentos con más detalle:`);
  topSegments.forEach((seg, i) => {
    const avgDeaths = seg.data.reduce((sum, p) => sum + (p.deaths_7d || 0), 0) / seg.data.length;
    console.log(`     ${i + 1}. ${seg.puntos} puntos - variabilidad: ${seg.variabilidad.toFixed(1)} - promedio: ${avgDeaths.toFixed(0)} muertes`);
  });

  return reducedData;
}

/**
 * Suaviza el BPM objetivo usando media móvil exponencial (EMA)
 * para transiciones graduales entre valores
 * @param {Number} targetBpm - BPM objetivo basado en los datos
 * @returns {Number} BPM suavizado
 */
function smoothBpm(targetBpm) {
  const alpha = 0.55; // Factor más reactivo para capturar mejor los cambios bruscos
  currentBpm = alpha * targetBpm + (1 - alpha) * currentBpm;
  return currentBpm;
}

function playHeartbeat(time = Tone.now(), bpm = 80) {
  if (!heartbeatLowSynth || !heartbeatHighSynth) {
    return;
  }

  const sanitizedBpm = Math.max(40, Math.min(180, bpm || 80));
  // Delay entre lub-dub: más corto en BPM altos (corazón acelerado)
  // Varía de ~0.18s (BPM bajo) a ~0.08s (BPM alto)
  const delay = Math.max(0.08, 0.25 - (sanitizedBpm - 40) / 600);

  heartbeatLowSynth.triggerAttackRelease('C2', '8n', time); // lub
  heartbeatHighSynth.triggerAttackRelease('E3', '16n', time + delay); // dub
}

function ensureVaccinationMarker() {
  const container = ensureChartContainer();
  if (container && !vaccinationMarker) {
    vaccinationMarker = document.createElement('div');
    vaccinationMarker.className = 'sound-vaccination-marker';
    vaccinationMarker.style.opacity = '0';
    vaccinationMarker.style.transform = 'translate(-50%, -50%) scale(1)';
    container.appendChild(vaccinationMarker);
  }
  return vaccinationMarker;
}

function hideVaccinationMarker() {
  if (vaccinationMarker) {
    vaccinationMarker.style.opacity = '0';
    vaccinationMarker.style.transform = 'translate(-50%, -50%) scale(1)';
  }
}

function hasActiveAgeFilters(state) {
  if (!state) {
    return false;
  }
  return Object.keys(state).some(key => !!state[key]);
}

function setPlayButtonState({ label, disabled, playing }) {
  if (!playButton) {
    return;
  }

  if (typeof label === 'string') {
    playButton.textContent = label;
  }

  if (typeof disabled === 'boolean') {
    playButton.disabled = disabled;
    playButton.classList.toggle('disabled', disabled);
  }

  if (typeof playing === 'boolean') {
    playButton.classList.toggle('playing', playing);
  }

  if (disabled) {
    playButton.classList.remove('playing');
  }
}

function updatePlaybackAvailability() {
  const comparisonActive = hasActiveAgeFilters(filterState);

  if (!playButton) {
    return;
  }

  // Actualizar botón de Sonificación
  if (comparisonActive) {
    setPlayButtonState({
      label: PLAY_LABEL_DISABLED,
      disabled: true,
      playing: false
    });

    if (progressIndicator) {
      progressIndicator.style.display = 'none';
    }
  } else if (isNarrativePlaybackActive) {
    // Si la narrativa está activa, deshabilitar el botón de sonificación
    setPlayButtonState({
      label: PLAY_LABEL_DEFAULT,
      disabled: true,
      playing: false
    });
  } else {
    // Comportamiento normal: mostrar play/stop según estado
    setPlayButtonState({
      label: isPlaying ? PLAY_LABEL_STOP : PLAY_LABEL_DEFAULT,
      disabled: false,
      playing: isPlaying
    });
  }

  // Actualizar botón de Narrativa
  const narrativeButton = document.getElementById('narrative-btn');
  if (narrativeButton) {
    if (comparisonActive) {
      narrativeButton.disabled = true;
      narrativeButton.classList.add('disabled');
      narrativeButton.textContent = NARRATIVE_LABEL_DISABLED;
    } else if (isPlaying && !isNarrativePlaybackActive) {
      // Si la sonificación está activa, deshabilitar el botón de narrativa
      narrativeButton.disabled = true;
      narrativeButton.classList.add('disabled');
      narrativeButton.textContent = NARRATIVE_LABEL_DEFAULT;
    } else {
      // Comportamiento normal: mostrar narrativa/detener según estado
      narrativeButton.disabled = false;
      narrativeButton.classList.remove('disabled');
      narrativeButton.textContent = isNarrativePlaybackActive ? NARRATIVE_LABEL_STOP : NARRATIVE_LABEL_DEFAULT;
    }
  }
}

function getContextDateParser() {
  if (!contextDateParser && typeof d3 !== 'undefined' && typeof d3.timeParse === 'function') {
    contextDateParser = d3.timeParse('%Y-%m-%d');
  }
  return contextDateParser;
}

function parseContextDateString(dateString) {
  if (!dateString) {
    return null;
  }
  const parser = getContextDateParser();
  if (!parser) {
    return null;
  }
  const parsed = parser(dateString.trim());
  return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function refreshContextElements() {
  if (!chartGroup || typeof chartGroup.selectAll !== 'function') {
    contextElements = [];
    return;
  }

  // Guardar el estado revealed actual para no perderlo
  const previousRevealedState = new Map();
  contextElements.forEach(item => {
    const dateKey = item.date ? item.date.getTime() : 'no-date';
    previousRevealedState.set(dateKey, item.revealed);
  });

  const nodes = chartGroup.selectAll('.contextual-element').nodes();
  contextElements = nodes.map(node => {
    const dateAttr = node.getAttribute('data-context-date') || '';
    const labelAttr = node.getAttribute('data-context-label') || '';
    const parsedDate = parseContextDateString(dateAttr);
    const dateKey = parsedDate ? parsedDate.getTime() : 'no-date';

    // Mantener el estado revealed previo si existe, sino calcular nuevo
    const wasRevealed = previousRevealedState.has(dateKey)
      ? previousRevealedState.get(dateKey)
      : (!(parsedDate instanceof Date) || !isPlaying);

    return {
      element: node,
      date: parsedDate,
      label: labelAttr,
      revealed: wasRevealed
    };
  });

  contextElements.sort((a, b) => {
    if (a.date && b.date) {
      return a.date - b.date;
    }
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });

  // Solo resetear el estado si NO estamos reproduciendo
  if (isPlaying) {
    // NO resetear revealed, solo aplicar clases según el estado actual
    contextElements.forEach(item => {
      if (item.revealed) {
        item.element.classList.remove('contextual-hidden');
      } else {
        item.element.classList.add('contextual-hidden');
      }
    });
  } else {
    contextElements.forEach(item => {
      item.revealed = true;
      item.element.classList.remove('contextual-hidden');
    });
  }

  console.log(`🧭 Contextos registrados: ${contextElements.length}`);
}

function resetContextElementsForPlayback() {
  if (!contextElements.length) {
    refreshContextElements();
  }

  contextElements.forEach(item => {
    // Limpiar animaciones residuales
    item.element.classList.remove('contextual-element--revealing');

    if (item.date instanceof Date) {
      item.revealed = false;
      item.element.classList.add('contextual-hidden');
    } else {
      item.revealed = true;
      item.element.classList.remove('contextual-hidden');
    }
  });
}

function revealContextElementsUpToDate(targetDate, silent = false) {
  if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) {
    return;
  }

  contextElements.forEach(item => {
    // Si no tiene fecha o ya fue revelado, saltar
    if (!item.date || item.revealed) {
      return;
    }

    // Solo revelar si la fecha del elemento ya pasó
    if (item.date <= targetDate) {
      // Marcar como revelado ANTES de agregar animación
      item.revealed = true;
      item.element.classList.remove('contextual-hidden');

      // Agregar animación SOLO la primera vez que se revela
      item.element.classList.add('contextual-element--revealing');

      // Remover la clase de animación después de que termine (800ms)
      setTimeout(() => {
        if (item.element) {
          item.element.classList.remove('contextual-element--revealing');
        }
      }, 800);

      if (!silent) {
        const label = item.label || item.element?.getAttribute('class') || 'contexto';
        console.log(`📝 Contexto activado: ${label}`);
      }
    }
  });
}

function restoreContextElementsVisibility() {
  contextElements.forEach(item => {
    if (item.element) {
      item.element.classList.remove('contextual-hidden');
      // Limpiar cualquier animación de revelación pendiente
      item.element.classList.remove('contextual-element--revealing');
    }
    item.revealed = true;
  });
}

function setDeathsLineDimmed(isDimmed) {
  if (!chartGroup || typeof chartGroup.select !== 'function') {
    console.warn('setDeathsLineDimmed: chartGroup no disponible');
    return;
  }

  const deathsLine = chartGroup.select('.line--deaths');
  if (deathsLine.empty()) {
    console.warn('setDeathsLineDimmed: no se encontró la línea de fallecidos');
    return;
  }

  if (originalDeathsStroke === null) {
    originalDeathsStroke = deathsLine.attr('stroke') || '#D43F3A';
  }
  if (originalDeathsStrokeWidth === null) {
    const widthAttr = deathsLine.attr('stroke-width');
    originalDeathsStrokeWidth = widthAttr ? parseFloat(widthAttr) : 3;
    if (!Number.isFinite(originalDeathsStrokeWidth)) {
      originalDeathsStrokeWidth = 3;
    }
  }
  if (originalDeathsStrokeOpacity === null) {
    const opacityAttr = deathsLine.attr('stroke-opacity');
    originalDeathsStrokeOpacity = opacityAttr ? parseFloat(opacityAttr) : 1;
    if (!Number.isFinite(originalDeathsStrokeOpacity)) {
      originalDeathsStrokeOpacity = 1;
    }
  }
  if (originalDeathsStyleOpacity === null) {
    const styleOpacity = deathsLine.style('opacity');
    originalDeathsStyleOpacity = styleOpacity !== undefined && styleOpacity !== null && styleOpacity !== ''
      ? parseFloat(styleOpacity)
      : null;
    if (originalDeathsStyleOpacity !== null && !Number.isFinite(originalDeathsStyleOpacity)) {
      originalDeathsStyleOpacity = null;
    }
  }

  deathsLine.classed('sonification-dimmed', !!isDimmed);

  if (isDimmed) {
    const dimmedWidth = Math.max(1, originalDeathsStrokeWidth * 0.5);
    deathsLine
      .attr('stroke', 'rgba(212, 63, 58, 0.1)')
      .attr('stroke-width', dimmedWidth)
      .attr('stroke-opacity', 0.12)
      .style('opacity', 0.06);
    console.log('🔻 Línea de fallecidos atenuada durante sonificación');
  } else {
    deathsLine
      .attr('stroke', originalDeathsStroke)
      .attr('stroke-width', originalDeathsStrokeWidth)
      .attr('stroke-opacity', originalDeathsStrokeOpacity)
      .style('opacity', originalDeathsStyleOpacity !== null ? originalDeathsStyleOpacity : null);
    console.log('🔺 Línea de fallecidos restaurada tras sonificación');
  }
}

function setVaccinationLineDimmed(isDimmed) {
  if (!chartGroup || typeof chartGroup.select !== 'function') {
    console.warn('setVaccinationLineDimmed: chartGroup no disponible');
    return;
  }

  const vaccinationLine = chartGroup.select('.line--vaccination-general');
  if (vaccinationLine.empty()) {
    console.warn('setVaccinationLineDimmed: no se encontró la línea de vacunación');
    return;
  }

  if (originalVaccinationStroke === null) {
    originalVaccinationStroke = vaccinationLine.attr('stroke') || VACCINATION_COLOR;
  }
  if (originalVaccinationStrokeWidth === null) {
    const widthAttr = vaccinationLine.attr('stroke-width');
    originalVaccinationStrokeWidth = widthAttr ? parseFloat(widthAttr) : 3;
    if (!Number.isFinite(originalVaccinationStrokeWidth)) {
      originalVaccinationStrokeWidth = 3;
    }
  }
  if (originalVaccinationStrokeOpacity === null) {
    const opacityAttr = vaccinationLine.attr('stroke-opacity');
    originalVaccinationStrokeOpacity = opacityAttr ? parseFloat(opacityAttr) : 1;
    if (!Number.isFinite(originalVaccinationStrokeOpacity)) {
      originalVaccinationStrokeOpacity = 1;
    }
  }
  if (originalVaccinationStyleOpacity === null) {
    const styleOpacity = vaccinationLine.style('opacity');
    originalVaccinationStyleOpacity = styleOpacity !== undefined && styleOpacity !== null && styleOpacity !== ''
      ? parseFloat(styleOpacity)
      : null;
    if (originalVaccinationStyleOpacity !== null && !Number.isFinite(originalVaccinationStyleOpacity)) {
      originalVaccinationStyleOpacity = null;
    }
  }

  vaccinationLine.classed('sonification-dimmed', !!isDimmed);

  if (isDimmed) {
    const dimmedWidth = Math.max(1, originalVaccinationStrokeWidth * 0.5);
    vaccinationLine
      .attr('stroke', 'rgba(31, 119, 180, 0.18)')
      .attr('stroke-width', dimmedWidth)
      .attr('stroke-opacity', 0.2)
      .style('opacity', 0.12);
    console.log('🔻 Línea de vacunación atenuada durante sonificación');
  } else {
    vaccinationLine
      .attr('stroke', originalVaccinationStroke)
      .attr('stroke-width', originalVaccinationStrokeWidth)
      .attr('stroke-opacity', originalVaccinationStrokeOpacity)
      .style('opacity', originalVaccinationStyleOpacity !== null ? originalVaccinationStyleOpacity : null);
    console.log('🔺 Línea de vacunación restaurada tras sonificación');
  }
}


/**
 * Inicializa el contexto de audio y los sintetizadores
 * Se llama después de un gesto del usuario (política de autoplay del navegador)
 */
async function inicializarAudio() {
  if (isAudioInitialized) {
    console.log('🎵 Audio ya inicializado');
    return;
  }

  try {
    // Iniciar contexto de audio de Tone.js
    await Tone.start();
    console.log('🎵 Contexto de audio iniciado correctamente');

    // ===== SINTETIZADORES DE LATIDO CARDÍACO =====
    heartbeatLowSynth = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 3,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0 },
    }).toDestination();

    heartbeatHighSynth = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 2,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
    }).toDestination();

    heartbeatReverb = new Tone.Reverb(1.2).toDestination();
    heartbeatCompressor = new Tone.Compressor(-20, 3).toDestination();

    heartbeatLowSynth.connect(heartbeatCompressor);
    heartbeatHighSynth.connect(heartbeatCompressor);
    heartbeatCompressor.connect(heartbeatReverb);

    isAudioInitialized = true;
    console.log('✅ Sintetizadores de latido configurados');

  } catch (error) {
    console.error('❌ Error al inicializar audio:', error);
  }
}

/**
 * Configura las escalas de mapeo de datos a frecuencias
 * @param {Array} data - Datos del gráfico
 */
function configurarEscalas(data) {
  if (!data || data.length === 0) {
    console.warn('⚠️ No hay datos para configurar escalas de sonido');
    return;
  }

  // Encontrar valores máximos para normalización
  const maxFallecidos = d3.max(data, d => d.deaths_7d) || 250;
  const maxVacunacion = 100; // El porcentaje siempre es 0-100

  // ===== MAPEOS DE DATOS A SONIDO =====
  // Fallecidos: valores más altos → latidos más rápidos
  // Rango extremadamente dramático para narrativa emocional intensa
  // Usando escala power (exponente 1.3) para enfatizar aún más los picos
  escalaLatidos = d3.scalePow()
    .exponent(1.3)  // Curva que enfatiza los valores altos (picos más dramáticos)
    .domain([0, maxFallecidos])
    .range([65, 200])  // BPM: pocas muertes = muy calmado (65), PICOS = pánico extremo (200)
    .clamp(true);

  console.log('🎼 Escala de sonificación tipo latido configurada:');
  console.log(`   - Fallecidos: ${maxFallecidos} max → 65-200 BPM (contraste extremo)`);
}

/**
 * Reproduce el sonido correspondiente a un punto de datos
 * @param {Object} punto - Punto de datos con {deaths_7d_smooth} o {deaths_7d}
 * @param {Number} duracion - Duración del beep en segundos (default muy corto para ECG)
 */
function reproducirPunto(punto, duracion = 0.08) {
  if (!isAudioInitialized || !punto) {
    return;
  }

  // Solo reproducir si hay datos válidos de fallecidos y la serie está habilitada
  const deathsEnabled = !filterState || filterState.deaths !== false;
  // Usar valor suavizado si existe, sino usar el original
  const deathsValue = punto.deaths_7d_smooth != null ? punto.deaths_7d_smooth : punto.deaths_7d;

  if (deathsEnabled && deathsValue != null && Number.isFinite(deathsValue)) {
    const bpmObjetivo = escalaLatidos ? escalaLatidos(deathsValue) : 80;
    playHeartbeat(undefined, bpmObjetivo);
    triggerDeathsMarkerPulse();

    const originalValue = punto.deaths_7d_original || punto.deaths_7d;
    console.log(`💓 Latido: ${Math.round(originalValue)} fallecidos (suavizado: ${Math.round(deathsValue)}) → ${Math.round(bpmObjetivo)} BPM`);
  }
}

/**
 * Obtiene los datos visibles según el zoom actual
 * @returns {Array} Datos filtrados por el rango visible
 */
function obtenerDatosVisibles() {
  if (!chartData || !scales || !scales.xScale) {
    return chartData || [];
  }

  // Modo narrativa: reproducir TODOS los datos desde el inicio
  // (aunque visualmente solo se muestre el zoom inicial)
  if (isNarrativeMode) {
    console.log(`📖 Modo narrativa: usando ${chartData.length} puntos totales`);
    return chartData;
  }

  // Obtener dominio visible (rango de fechas en pantalla)
  const dominioVisible = scales.xScale.domain();

  // Filtrar datos dentro del rango visible
  const datosVisibles = chartData.filter(d =>
    d.date >= dominioVisible[0] && d.date <= dominioVisible[1]
  );

  console.log(`📊 Datos visibles: ${datosVisibles.length} de ${chartData.length} puntos totales`);
  return datosVisibles;
}

/**
 * Reproduce la sonificación automática de los datos visibles
 */
async function reproducirSonificacion() {
  // Inicializar audio si es necesario (requiere gesto del usuario)
  if (!isAudioInitialized) {
    await inicializarAudio();
    if (!isAudioInitialized) {
      alert('No se pudo inicializar el audio. Verifica los permisos del navegador.');
      return;
    }
  }

  // Evitar múltiples reproducciones simultáneas
  if (isPlaying) {
    detenerReproduccion();
    return;
  }

  if (hasActiveAgeFilters(filterState)) {
    updatePlaybackAvailability();
    console.warn('La sonificación solo está disponible cuando se muestra la población general.');
    return;
  }

  const datosVisibles = obtenerDatosVisibles();

  if (!datosVisibles || datosVisibles.length === 0) {
    alert('No hay datos visibles para sonificar. Ajusta el zoom o activa al menos una serie.');
    return;
  }

  // Procesar datos para audio: suavizado + reducción inteligente para 30 segundos máximo
  const datosProcesados = prepararDatosParaSonido(datosVisibles);

  if (!datosProcesados || datosProcesados.length === 0) {
    alert('Error al procesar datos para sonificación.');
    return;
  }

  playbackStartDate = datosProcesados[0]?.date || null;

  ensureChartContainer();
  ensureHighlightPath();
  ensureVaccinationHighlightPath();
  ensureDeathsMarker();
  ensureVaccinationMarker();
  hideHighlightPath();
  hideDeathsMarker();
  hideVaccinationMarker();
  refreshContextElements();
  resetContextElementsForPlayback();
  lastPlaybackDate = null;
  setDeathsLineDimmed(true);
  setVaccinationLineDimmed(true);

  console.log('▶️ Reproduciendo sonificación de datos...');
  isPlaying = true;
  window.__disableZoom = true; // Deshabilitar zoom durante reproducción
  setFiltersLocked(true);

  updatePlaybackAvailability();

  // No mostrar indicador de progreso para evitar superposición visual
  if (progressIndicator) {
    progressIndicator.style.display = 'none';
  }

  // Inicializar BPM con el primer punto
  const firstDeaths = datosProcesados[0]?.deaths_7d_smooth || datosProcesados[0]?.deaths_7d;
  if (datosProcesados.length > 0 && firstDeaths != null) {
    currentBpm = escalaLatidos ? escalaLatidos(firstDeaths) : 60;
  } else {
    currentBpm = 60;
  }

  // ===== EVENTOS DE REPRODUCCIÓN CON INTERVALO DINÁMICO =====
  let indice = 0;

  const reproducirProximoPunto = () => {
    if (!isPlaying || indice >= datosProcesados.length) {
      // Fin de la reproducción
      detenerReproduccion();
      return;
    }

    const punto = datosProcesados[indice];

    if (typeof centerOnDateCallback === 'function') {
      centerOnDateCallback(punto.date);
    }

    revealContextElementsUpToDate(punto.date);
    if (punto.date instanceof Date && !Number.isNaN(punto.date.getTime())) {
      lastPlaybackDate = punto.date;
    }

    // Calcular BPM objetivo basado en los datos (usar valor suavizado si existe)
    const deathsValue = punto.deaths_7d_smooth != null ? punto.deaths_7d_smooth : punto.deaths_7d;
    const bpmObjetivo = deathsValue != null && Number.isFinite(deathsValue) && escalaLatidos
      ? escalaLatidos(deathsValue)
      : 60;

    // Suavizar el BPM para transiciones graduales
    const bpmSuavizado = smoothBpm(bpmObjetivo);

    // Reproducir sonido del punto actual
    reproducirPunto(punto, 0.12);

    // Actualizar indicador visual de progreso
    actualizarIndicadorProgreso(punto);

    // Log de progreso
    const fechaFormateada = d3.timeFormat('%d/%m/%Y')(punto.date);
    const originalValue = punto.deaths_7d_original || punto.deaths_7d;
    console.log(`🎧 [${indice + 1}/${datosProcesados.length}] ${fechaFormateada}: ${Math.round(originalValue)} fallecidos → ${Math.round(bpmSuavizado)} BPM`);

    indice++;

    // Calcular intervalo dinámico basado en BPM suavizado
    // BPM = latidos por minuto → intervalo en ms = 60000 / BPM
    const intervaloMs = 60000 / bpmSuavizado;

    // Programar el siguiente punto con el intervalo calculado
    playbackInterval = setTimeout(reproducirProximoPunto, intervaloMs);
  };

  // Iniciar la reproducción
  reproducirProximoPunto();
}

/**
 * Detiene la reproducción automática
 */
function detenerReproduccion() {
  const narrativeWasActive = isNarrativeMode || isNarrativePlaybackActive;

  if (playbackInterval) {
    clearTimeout(playbackInterval);
    playbackInterval = null;
  }

  isPlaying = false;
  playbackStartDate = null;
  currentBpm = 60; // Reiniciar BPM para la próxima reproducción
  isNarrativeMode = false; // Desactivar modo narrativa
  isNarrativePlaybackActive = false; // Desactivar flag de narrativa activa
  window.__disableZoom = false; // Rehabilitar zoom
  setFiltersLocked(false);
  setDeathsLineDimmed(false);
  setVaccinationLineDimmed(false);
  hideHighlightPath();
  hideDeathsMarker();
  hideVaccinationMarker();
  restoreContextElementsVisibility();
  lastPlaybackDate = null;

  updatePlaybackAvailability();

  // Ocultar indicador de progreso
  if (progressIndicator) {
    progressIndicator.style.display = 'none';
  }

  if (narrativeWasActive) {
    resetZoom().catch(() => {});
  }

  console.log('⏹️ Reproducción detenida');
}

/**
 * Actualiza el indicador visual de progreso en el gráfico
 * @param {Object} punto - Punto de datos actual
 */
function actualizarIndicadorProgreso(punto) {
  if (!scales || !scales.xScale || !chartGroup || !progressIndicator) {
    return;
  }

  const container = ensureChartContainer();
  const chartElement = chartGroup.node ? chartGroup.node() : null;
  ensureHighlightPath();
  ensureVaccinationHighlightPath();
  ensureDeathsMarker();

  if (!container || !chartElement || typeof chartElement.getBoundingClientRect !== 'function') {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const svgElement = chartElement.ownerSVGElement;
  const ctm = typeof chartElement.getScreenCTM === 'function' ? chartElement.getScreenCTM() : null;

  if (!svgElement || !ctm) {
    return;
  }

  const projectPoint = (x, y) => {
    const point = svgElement.createSVGPoint();
    point.x = x;
    point.y = y;
    const transformed = point.matrixTransform(ctm);
    return {
      left: transformed.x - containerRect.left,
      top: transformed.y - containerRect.top
    };
  };

  const xRange = scales.xScale.range();
  const xSpan = xRange[1] - xRange[0];
  if (!isFinite(xSpan) || xSpan === 0) {
    return;
  }

  const xPos = scales.xScale(punto.date);
  if (!isFinite(xPos)) {
    return;
  }

  const clampedX = Math.min(Math.max(xPos, xRange[0]), xRange[1]);
  const projectedTop = projectPoint(clampedX, 0);
  const projectedBottom = projectPoint(clampedX, scales.yLeftScale.range()[0]);
  const indicatorLeft = projectedTop.left;
  const indicatorTop = Math.min(projectedTop.top, projectedBottom.top);
  const indicatorHeight = Math.abs(projectedBottom.top - projectedTop.top);

  progressIndicator.style.display = 'none';

  const highlightPath = ensureHighlightPath();
  const vaccinationHighlightPath = ensureVaccinationHighlightPath();

  if (highlightPath && chartData) {
    const minDate = playbackStartDate instanceof Date ? playbackStartDate : null;
    const highlightData = chartData.filter(d =>
      d.date instanceof Date &&
      d.date <= punto.date &&
      (!minDate || d.date >= minDate) &&
      d.deaths_7d != null &&
      isFinite(d.deaths_7d)
    );

    if (highlightData.length >= 2) {
      const highlightLine = d3.line()
        .x(d => scales.xScale(d.date))
        .y(d => scales.yLeftScale(d.deaths_7d))
        .curve(d3.curveMonotoneX)
        .defined(d => d.date && !isNaN(d.deaths_7d) && isFinite(d.deaths_7d));

      highlightPath
        .attr('d', highlightLine(highlightData))
        .style('opacity', 1);
    } else {
      hideDeathsHighlightPath();
    }
  } else {
    hideDeathsHighlightPath();
  }

  if (vaccinationHighlightPath && chartData) {
    const minDate = playbackStartDate instanceof Date ? playbackStartDate : null;
    const vaccinationHighlightData = chartData.filter(d =>
      d.date instanceof Date &&
      d.date <= punto.date &&
      (!minDate || d.date >= minDate) &&
      d.vaccinated_pct != null &&
      isFinite(d.vaccinated_pct)
    );

    if (vaccinationHighlightData.length >= 2) {
      const vaccinationLine = d3.line()
        .x(d => scales.xScale(d.date))
        .y(d => scales.yRightScale(d.vaccinated_pct))
        .curve(d3.curveMonotoneX)
        .defined(d => d.date && !isNaN(d.vaccinated_pct) && isFinite(d.vaccinated_pct));

      vaccinationHighlightPath
        .attr('d', vaccinationLine(vaccinationHighlightData))
        .style('opacity', 1);
    } else {
      hideVaccinationHighlightPath();
    }
  } else {
    hideVaccinationHighlightPath();
  }


  if (deathsMarker) {
    if (punto.deaths_7d != null && isFinite(punto.deaths_7d)) {
      const yPos = scales.yLeftScale(punto.deaths_7d);
      const markerPoint = projectPoint(clampedX, yPos);
      deathsMarker.style.left = `${markerPoint.left}px`;
      deathsMarker.style.top = `${markerPoint.top}px`;
      deathsMarker.style.opacity = '1';
      deathsMarker.style.transform = 'translate(-50%, -50%) scale(1)';
    } else {
      hideDeathsMarker();
    }
  }

  if (vaccinationMarker) {
    if (punto.vaccinated_pct != null && isFinite(punto.vaccinated_pct)) {
      const yPosVaccination = scales.yRightScale(punto.vaccinated_pct);
      const vaccinationPoint = projectPoint(clampedX, yPosVaccination);
      vaccinationMarker.style.left = `${vaccinationPoint.left}px`;
      vaccinationMarker.style.top = `${vaccinationPoint.top}px`;
      vaccinationMarker.style.opacity = '1';
      vaccinationMarker.style.transform = 'translate(-50%, -50%) scale(1)';
    } else {
      hideVaccinationMarker();
    }
  }
}


/**
 * Maneja el evento de hover en el tooltip
 * Reproduce un "ping" corto del punto bajo el cursor
 * @param {Object} punto - Punto de datos bajo el cursor
 */
export function onHoverPoint(punto) {
  // Hover silencioso: evitar reproducir sonido cuando el usuario explora con el mouse
  return;
}

/**
 * Verifica si la sonificación está activa
 * @returns {boolean} true si la sonificación está en reproducción
 */
export function isSonificationPlaying() {
  return isPlaying;
}

/**
 * Limpia los recursos de audio al cambiar filtros/zoom
 */
export function cleanupSound() {
  if (isPlaying) {
    detenerReproduccion();
  }

  hideHighlightPath();
  hideDeathsMarker();
  hideVaccinationMarker();
  restoreContextElementsVisibility();
  lastPlaybackDate = null;
  setDeathsLineDimmed(false);
  setVaccinationLineDimmed(false);
  updatePlaybackAvailability();

  console.log('🧹 Limpieza de sonificación completada');
}

/**
 * Inicializa el módulo de sonificación
 * @param {Array} data - Datos del gráfico
 * @param {Object} filters - Estado de filtros
 * @param {Object} chartScales - Escalas del gráfico
 * @param {Object} svg - Grupo SVG del gráfico
 */
export function initSound(data, filters, chartScales, svg, options = {}) {
  console.log('🎼 Inicializando módulo de sonificación...');

  // Guardar referencias globales
  chartData = data;
  filterState = filters;
  scales = chartScales;
  chartGroup = svg;

  chartContainerElement = document.getElementById('chart-container');
  ensureHighlightPath();
  ensureVaccinationHighlightPath();
  ensureDeathsMarker();
  ensureVaccinationMarker();
  centerOnDateCallback = typeof options.centerOnDate === 'function' ? options.centerOnDate : centerOnDateCallback;
  refreshContextElements();

  // Configurar escalas de sonido
  configurarEscalas(data);

  // Obtener referencias a elementos del DOM
  playButton = document.getElementById('sound-play-btn');
  progressIndicator = document.getElementById('sound-progress');
  const narrativeButton = document.getElementById('narrative-btn');

  // ===== EVENTOS DE BOTONES =====
  if (playButton) {
    playButton.addEventListener('click', async () => {
      // Desactivar modo narrativa (si estaba activo)
      isNarrativeMode = false;
      isNarrativePlaybackActive = false;
      // Primero resetear el zoom a vista completa
      await resetZoom();
      // Luego reproducir la sonificación
      await reproducirSonificacion();
    });
    console.log('✅ Botón de reproducción configurado');
  }

  if (narrativeButton) {
    narrativeButton.addEventListener('click', async () => {
      // Si ya está reproduciéndose en modo narrativa, detener
      if (isNarrativePlaybackActive) {
        detenerReproduccion();
        return;
      }

      // Modo narrativa: hacer zoom al inicio de la pandemia y luego reproducir
      isNarrativeMode = true;
      isNarrativePlaybackActive = true;
      await zoomToNarrativeStart();
      await reproducirSonificacion();
    });
    console.log('✅ Botón de narrativa configurado');
  }

  updatePlaybackAvailability();

  console.log('✅ Módulo de sonificación inicializado correctamente');
  console.log('📌 Nota: El audio se activará después del primer clic en "Reproducir" (política de autoplay del navegador)');
}

/**
 * Actualiza las referencias del módulo cuando cambian (ej. después de zoom/resize)
 * @param {Object} chartScales - Nuevas escalas del gráfico
 * @param {Object} filters - Nuevo estado de filtros
 * @param {Object} [svgGroup] - Nuevo grupo SVG (opcional)
 */
export function updateSoundReferences(chartScales, filters, svgGroup = null, options = {}) {
  scales = chartScales;
  filterState = filters;

  const hasValidGroup = svgGroup && typeof svgGroup.select === 'function';
  if (hasValidGroup) {
    const isDifferentGroup = chartGroup !== svgGroup;
    chartGroup = svgGroup;
    if (isDifferentGroup) {
      deathsHighlightPath = null;
      vaccinationHighlightPath = null;
    }
  }

  ensureChartContainer();
  ensureHighlightPath();
  ensureVaccinationHighlightPath();
  ensureDeathsMarker();
  ensureVaccinationMarker();
  refreshContextElements();
  setDeathsLineDimmed(isPlaying);
  setVaccinationLineDimmed(isPlaying);

  if (options && typeof options.centerOnDate === 'function') {
    centerOnDateCallback = options.centerOnDate;
  }

  if (!isPlaying) {
    hideDeathsMarker();
    hideVaccinationMarker();
  }

  updatePlaybackAvailability();

  console.log('🔄 Referencias de sonificación actualizadas');
}
