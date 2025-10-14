/**
 * Módulo de sonificación de datos para COVID-19 Chile
 * Convierte valores cuantitativos en feedback auditivo
 */

// ===== CONFIGURACIÓN DE AUDIO =====
let audioContext = null;
let synthDeaths = null;        // Sintetizador para fallecidos (tipo ECG/pulso)
let isAudioInitialized = false;
let isMuted = false;
let isPlaying = false;
let playbackInterval = null;

// ===== ESCALAS DE MAPEO DE DATOS A SONIDO =====
let escalaMuertes = null;      // Escala: fallecidos → frecuencia (beep de ECG)

// ===== REFERENCIAS A ELEMENTOS DEL DOM =====
let playButton = null;
let muteButton = null;
let progressIndicator = null;

// ===== ESTADO GLOBAL DEL CHART (se importará desde chart.js) =====
let chartData = null;
let filterState = null;
let scales = null;
let chartGroup = null;

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

    // ===== SINTETIZADOR TIPO ELECTROCARDIOGRAMA (ECG) =====
    // Beep corto y agudo similar al monitor de pulso cardíaco
    synthDeaths = new Tone.MembraneSynth({
      pitchDecay: 0.008,  // Decay muy rápido para beep corto
      octaves: 2,
      oscillator: {
        type: 'sine'
      },
      envelope: {
        attack: 0.001,    // Ataque instantáneo (beep)
        decay: 0.1,       // Decay rápido
        sustain: 0,       // Sin sustain (beep corto)
        release: 0.05     // Release muy corto
      },
      volume: -6  // Volumen alto para claridad del beep
    }).toDestination();

    isAudioInitialized = true;
    console.log('✅ Sintetizador ECG creado: beeps tipo electrocardiograma');

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
  // Fallecidos: valores más altos → frecuencias más ALTAS (beep más agudo = más muertes)
  // Sonido tipo ECG: frecuencia determina el tono del beep
  escalaMuertes = d3.scaleLinear()
    .domain([0, maxFallecidos])
    .range([150, 600])  // Rango amplio: pocas muertes = beep grave, muchas = beep muy agudo
    .clamp(true);

  console.log('🎼 Escala de sonificación tipo ECG configurada:');
  console.log(`   - Fallecidos: ${maxFallecidos} max → 150-600 Hz (beep tipo electrocardiograma)`);
}

/**
 * Reproduce el sonido correspondiente a un punto de datos
 * @param {Object} punto - Punto de datos con {deaths_7d}
 * @param {Number} duracion - Duración del beep en segundos (default muy corto para ECG)
 */
function reproducirPunto(punto, duracion = 0.08) {
  if (!isAudioInitialized || isMuted || !punto) {
    return;
  }

  // Solo reproducir si hay datos de fallecidos y el filtro está activo
  if (filterState && filterState.deaths && punto.deaths_7d != null) {
    const frecuenciaBeep = escalaMuertes(punto.deaths_7d);

    // MembraneSynth usa triggerAttackRelease con la frecuencia como nota
    // El beep será corto e intenso, tipo ECG
    synthDeaths.triggerAttackRelease(frecuenciaBeep, duracion);

    console.log(`💓 Beep ECG: ${Math.round(punto.deaths_7d)} fallecidos → ${Math.round(frecuenciaBeep)} Hz`);
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

  const datosVisibles = obtenerDatosVisibles();

  if (!datosVisibles || datosVisibles.length === 0) {
    alert('No hay datos visibles para sonificar. Ajusta el zoom o activa al menos una serie.');
    return;
  }

  console.log('▶️ Reproduciendo sonificación de datos...');
  isPlaying = true;

  // Cambiar texto del botón
  if (playButton) {
    playButton.textContent = '⏸️ Detener';
    playButton.classList.add('playing');
  }

  // Mostrar indicador de progreso
  if (progressIndicator) {
    progressIndicator.style.display = 'block';
  }

  // ===== EVENTOS DE REPRODUCCIÓN =====
  let indice = 0;
  const intervaloMs = 100; // 100ms entre puntos = ~10 puntos por segundo

  playbackInterval = setInterval(() => {
    if (indice >= datosVisibles.length) {
      // Fin de la reproducción
      detenerReproduccion();
      return;
    }

    const punto = datosVisibles[indice];

    // Reproducir sonido del punto actual
    reproducirPunto(punto, 0.12);

    // Actualizar indicador visual de progreso
    actualizarIndicadorProgreso(punto);

    // Log de progreso
    const fechaFormateada = d3.timeFormat('%d/%m/%Y')(punto.date);
    console.log(`🎧 [${indice + 1}/${datosVisibles.length}] Reproduciendo datos del ${fechaFormateada}: ${Math.round(punto.deaths_7d)} fallecidos, ${punto.vaccinated_pct.toFixed(1)}% vacunación`);

    indice++;
  }, intervaloMs);
}

/**
 * Detiene la reproducción automática
 */
function detenerReproduccion() {
  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }

  isPlaying = false;

  // Restaurar botón
  if (playButton) {
    playButton.textContent = '▶️ Reproducir Sonificación';
    playButton.classList.remove('playing');
  }

  // Ocultar indicador de progreso
  if (progressIndicator) {
    progressIndicator.style.display = 'none';
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

  const xPos = scales.xScale(punto.date);

  // Posicionar línea vertical de progreso
  // El SVG tiene viewBox y preserveAspectRatio, necesitamos calcular posición real
  const svg = document.getElementById('chart-root');
  const svgRect = svg.getBoundingClientRect();
  const containerRect = document.getElementById('chart-container').getBoundingClientRect();

  // Calcular escala del SVG (puede ser diferente por aspect ratio)
  const scaleX = svgRect.width / 720; // 720 es el width del CHART_CONFIG

  // Posición considerando margen izquierdo (56px) y escala
  const margenIzquierdo = 56 * scaleX;
  const posicionReal = (xPos * scaleX) + margenIzquierdo + (svgRect.left - containerRect.left);

  progressIndicator.style.left = `${posicionReal}px`;

  // También ajustar top y height para que coincida con el área del gráfico
  const margenSuperior = 56 * (svgRect.height / 400); // 400 es el height del CHART_CONFIG
  progressIndicator.style.top = `${margenSuperior}px`;
  progressIndicator.style.height = `${svgRect.height - margenSuperior - (65 * (svgRect.height / 400))}px`;

  progressIndicator.style.display = 'block';
}

/**
 * Alterna el estado de silencio
 */
function toggleMute() {
  isMuted = !isMuted;

  if (muteButton) {
    if (isMuted) {
      muteButton.textContent = '🔊 Activar';
      muteButton.classList.add('muted');
      console.log('🔇 Audio silenciado');
    } else {
      muteButton.textContent = '🔇 Silenciar';
      muteButton.classList.remove('muted');
      console.log('🔊 Audio activado');
    }
  }

  // Si está reproduciendo y se silencia, detener
  if (isMuted && isPlaying) {
    detenerReproduccion();
  }
}

/**
 * Maneja el evento de hover en el tooltip
 * Reproduce un "ping" corto del punto bajo el cursor
 * @param {Object} punto - Punto de datos bajo el cursor
 */
export function onHoverPoint(punto) {
  if (!isAudioInitialized || isPlaying) {
    return; // No reproducir durante playback automático
  }

  // Reproducir sonido corto (ping)
  reproducirPunto(punto, 0.08);
}

/**
 * Limpia los recursos de audio al cambiar filtros/zoom
 */
export function cleanupSound() {
  if (isPlaying) {
    detenerReproduccion();
  }
  console.log('🧹 Limpieza de sonificación completada');
}

/**
 * Inicializa el módulo de sonificación
 * @param {Array} data - Datos del gráfico
 * @param {Object} filters - Estado de filtros
 * @param {Object} chartScales - Escalas del gráfico
 * @param {Object} svg - Grupo SVG del gráfico
 */
export function initSound(data, filters, chartScales, svg) {
  console.log('🎼 Inicializando módulo de sonificación...');

  // Guardar referencias globales
  chartData = data;
  filterState = filters;
  scales = chartScales;
  chartGroup = svg;

  // Configurar escalas de sonido
  configurarEscalas(data);

  // Obtener referencias a elementos del DOM
  playButton = document.getElementById('sound-play-btn');
  muteButton = document.getElementById('sound-mute-btn');
  progressIndicator = document.getElementById('sound-progress');

  // ===== EVENTOS DE BOTONES =====
  if (playButton) {
    playButton.addEventListener('click', async () => {
      await reproducirSonificacion();
    });
    console.log('✅ Botón de reproducción configurado');
  }

  if (muteButton) {
    muteButton.addEventListener('click', () => {
      toggleMute();
    });
    console.log('✅ Botón de silencio configurado');
  }

  console.log('✅ Módulo de sonificación inicializado correctamente');
  console.log('📌 Nota: El audio se activará después del primer clic en "Reproducir" (política de autoplay del navegador)');
}

/**
 * Actualiza las referencias del módulo cuando cambian (ej. después de zoom/resize)
 * @param {Object} chartScales - Nuevas escalas del gráfico
 * @param {Object} filters - Nuevo estado de filtros
 */
export function updateSoundReferences(chartScales, filters) {
  scales = chartScales;
  filterState = filters;

  console.log('🔄 Referencias de sonificación actualizadas');
}
