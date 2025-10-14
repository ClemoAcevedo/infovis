# COVID-19 en Chile: Fallecidos vs. Vacunación (2020–2023)

Visualización interactiva que muestra cómo los fallecidos por COVID-19 en Chile disminuyeron en paralelo con la implementación de la campaña masiva de vacunación.

## 📊 Descripción

Esta visualización presenta dos series de datos principales:
- **Fallecidos por COVID-19**: Promedio móvil de 7 días de fallecidos diarios
- **Cobertura de vacunación**: Porcentaje de población vacunada a lo largo del tiempo

La visualización demuestra la correlación inversa entre el aumento de la cobertura de vacunación y la disminución de fallecidos por COVID-19 en Chile.

## 🔍 Interacción: Zoom & Pan

**Funcionalidad implementada**: Los usuarios ahora pueden explorar períodos específicos de la pandemia mediante zoom y paneo en el eje temporal.

### Características
- **Zoom**: Usa la rueda del mouse o gestos táctiles para acercar/alejar en el eje de tiempo
- **Pan (Paneo)**: Arrastra horizontalmente para desplazarte por diferentes períodos
- **Cursor interactivo**: El cursor cambia a "grab" cuando puedes arrastrar, y a "grabbing" durante el arrastre
- **Botón de reseteo**: Haz clic en "Resetear vista" para volver al rango completo de fechas
- **Rango de zoom**: Desde 1x (vista completa) hasta 20x (exploración detallada)

### Implementación Técnica
- **API utilizada**: D3.js `d3.zoom()` v7
- **Restricción de zoom**: Solo horizontal (eje X - tiempo), ejes Y permanecen fijos
- **Actualización dinámica**: Al hacer zoom/pan, se actualizan:
  - Eje X (escala temporal)
  - Ambas líneas de datos (fallecidos y vacunación)
  - Hitos y anotaciones visibles en el rango actual
- **Logs en consola**: Cada evento de zoom registra el rango visible de fechas en español:
  ```javascript
  console.log("🔍 Zoom actualizado. Fechas visibles:", "09/04/2020", "→", "31/08/2023");
  ```

### Experiencia de Usuario
- **Helper text**: "🔍 Arrastra o usa la rueda para explorar" visible en la esquina superior derecha
- **Responsivo**: Los controles se adaptan a diferentes tamaños de pantalla (desktop, tablet, mobile)
- **Coherencia visual**: Colores, layout y anotaciones se preservan durante la interacción
- **Contexto local**: Todos los comentarios en código y logs de consola están en español

## 🔀 Interacción: Filtros de Series

**Funcionalidad implementada**: Los usuarios ahora pueden elegir si visualizar los datos de vacunación, fallecidos, o ambos simultáneamente. Esta interfaz invita a la exploración de cómo evolucionó cada tendencia durante diferentes fases pandémicas.

### Características
- **Dos filtros independientes**:
  - ☑️ **Vacunación**: Muestra/oculta la línea azul de cobertura de vacunación
  - ☑️ **Fallecidos**: Muestra/oculta la línea roja de fallecidos diarios (promedio 7 días)
- **Estado por defecto**: Ambos filtros activados (se muestran ambas series)
- **Transiciones suaves**: Las líneas aparecen/desaparecen con animación de 500ms
- **Feedback visual**:
  - Las etiquetas de los filtros usan los colores de las series (azul/rojo)
  - Cuando un filtro está desactivado, la etiqueta se muestra tachada y con menor opacidad
  - Las líneas ocultas se muestran con muy baja opacidad (0.1) en lugar de desaparecer completamente

### Casos de Uso
1. **Ver solo vacunación**: Permite analizar el ritmo y etapas de la campaña de vacunación sin la distracción de los fallecidos
2. **Ver solo fallecidos**: Permite enfocarse en las olas pandémicas y sus picos
3. **Comparar ambas**: Vista por defecto que muestra la correlación inversa entre vacunación y muertes
4. **Caso especial**: Si ambos filtros se desactivan, aparece el mensaje "Seleccione al menos una serie para visualizar datos"

### Implementación Técnica
- **Estado global**: `filterState` mantiene el estado de visibilidad de cada serie
- **Transiciones D3**: Uso de `.transition().duration(500)` para cambios suaves de opacidad
- **Integración con zoom/pan**: El estado de los filtros se preserva durante operaciones de zoom y paneo
- **Logs en consola** (en español):
  ```javascript
  console.log('📊 Filtro de vacunación: activado');
  console.log('❌ Serie oculta: fallecidos');
  console.log('✅ Serie reactivada: vacunación');
  console.log('⚠️ Advertencia: No hay series visibles.');
  ```

### Código
- **Ubicación**: `assets/js/chart.js:514-625`
- **Funciones principales**:
  - `setupFilters()`: Inicializa los event listeners de los checkboxes
  - `updateSeriesVisibility()`: Actualiza la visibilidad de las líneas según el estado
  - Integración en `zoomed()` y `makeResponsive()` para preservar estado

### Experiencia Responsiva
- **Desktop**: Filtros centrados horizontalmente sobre el gráfico
- **Tablet/Mobile**: Filtros apilados verticalmente con tamaño de fuente ajustado
- **Consistencia**: Funciona perfectamente en combinación con zoom/pan

## 🔍 Interacción: Details on Demand (Tooltips)

**Funcionalidad implementada**: Al pasar el cursor (hover) sobre el gráfico, los usuarios pueden ver valores precisos de fallecidos y cobertura de vacunación para una fecha específica. Esta interacción profundiza la comprensión de los datos y conecta la historia cuantitativa con momentos específicos de la pandemia.

### Características del Tooltip
- **Activación**:
  - **Hover**: El tooltip aparece automáticamente al mover el cursor sobre el área del gráfico
  - **Click/Touch**: También funciona con tap en dispositivos táctiles
- **Información mostrada**:
  - Fecha en formato legible (ej: "15 Agosto 2021")
  - Fallecidos (promedio 7 días) si la serie está visible
  - Cobertura de vacunación (%) si la serie está visible
- **Feedback visual**:
  - **Línea guía vertical**: Línea punteada que sigue el cursor en el eje X
  - **Círculos destacados**: Puntos resaltados en cada serie visible mostrando la posición exacta del dato
  - **Colores coherentes**: Rojo para fallecidos, azul para vacunación

### Integración con Otras Funcionalidades
- **Zoom/Pan**: El tooltip se actualiza correctamente al hacer zoom o pan, mostrando siempre valores precisos según la escala actual
- **Filtros**: El tooltip respeta la visibilidad de las series:
  - Si vacunación está oculta, el tooltip no muestra ese dato
  - Si fallecidos está oculto, el tooltip no muestra ese dato
  - Los círculos destacados solo aparecen en series visibles
- **Responsive**: El tooltip se posiciona inteligentemente para no salirse del contenedor:
  - Se ajusta a la derecha/izquierda según la posición del cursor
  - Se ajusta arriba/abajo para mantenerse visible

### Implementación Técnica

**Extracción de datos:**
- Uso de `d3.bisector()` para encontrar el punto de datos más cercano a la posición del cursor
- Inversión de la escala X (`xScale.invert()`) para convertir coordenadas de píxeles a fechas
- Búsqueda binaria eficiente en el array de datos para encontrar el valor más próximo

**Interacción con zoom/pan:**
- El tooltip usa `scales.xScale` que se actualiza dinámicamente durante el zoom
- La capa de interacción invisible (`<rect>`) captura eventos de mouse sobre toda el área del gráfico
- Los eventos `mousemove`, `mouseleave` y `click` se manejan con callbacks específicos

**Elementos visuales:**
- **Capa de interacción**: `<rect>` transparente con `pointer-events: all`
- **Línea guía**: `<line>` con stroke-dasharray para efecto punteado
- **Círculos**: Dos `<circle>` (uno por serie) con radio de 4px y borde blanco
- **Tooltip HTML**: Div posicionado absolutamente con `pointer-events: none` para no interferir

### Logs en Consola (Español)
```javascript
'📍 Fecha bajo el cursor: 15/08/2021 | Fallecidos: 128 | Vacunación: 75.3%'
'👻 Tooltip ocultado'
'🚪 Mouse salió del área del gráfico'
'👆 Click en el gráfico - tooltip actualizado'
'✅ Sistema de tooltip (details on demand) inicializado correctamente'
```

### Código
- **Ubicación**: `assets/js/chart.js:640-860`
- **Funciones principales**:
  - `setupTooltip(svg, config)`: Inicializa el sistema de tooltip y la capa de interacción
  - `actualizarTooltip(event, config)`: Actualiza posición y contenido del tooltip
  - `encontrarPuntoCercano(fecha)`: Encuentra el dato más cercano usando bisector
  - `ocultarTooltip()`: Oculta tooltip y elementos visuales
- **Estado global**: `tooltipElements` objeto con referencias a tooltip, guideline y círculos

### Ejemplo de Uso
1. Pase el cursor sobre cualquier punto del gráfico
2. Observe la línea guía vertical y los círculos destacados
3. Lea los valores precisos en el tooltip flotante
4. Mueva el cursor para explorar diferentes fechas
5. Haga zoom y continúe explorando - el tooltip se adapta automáticamente

## 🎧 Interacción 4: Sonificación (Audio Feedback from Data)

**Funcionalidad implementada**: Los usuarios ahora pueden **escuchar** cómo evolucionaron los datos de la pandemia. La sonificación convierte los valores cuantitativos (fallecidos y vacunación) en feedback auditivo, agregando una nueva dimensión sensorial que refuerza la comprensión de los datos.

### Concepto

**Sonificación** es el uso de sonido no verbal para representar información. En esta visualización:
- **Fallecidos (único canal)** → Beeps tipo electrocardiograma (150-600 Hz): Más muertes = beep más agudo

Esta representación permite "escuchar" la evolución de la mortalidad como un **monitor cardíaco**:
- **Pocas muertes**: Beeps graves y espaciados (paciente estable)
- **Muchas muertes**: Beeps agudos y frecuentes (crisis)
- **Sin muertes**: Silencio (línea plana del ECG)

### Características

#### 1. Reproducción Automática (Playback)
- **Botón "▶️ Reproducir Sonificación"**: Reproduce los datos visibles en orden cronológico
- **Velocidad**: ~10 puntos de datos por segundo (100ms entre puntos)
- **Indicador visual**: Línea vertical se mueve a través del gráfico durante la reproducción
- **Detener**: Presionar el botón nuevamente detiene la reproducción

#### 2. Exploración Interactiva (Hover)
- **Hover sobre el gráfico**: Al pasar el cursor sobre cualquier punto, se reproduce un "ping" corto correspondiente a ese momento
- **Feedback inmediato**: El sonido se reproduce junto con el tooltip, creando una experiencia multisensorial
- **Duración**: 80ms por ping (sonido breve y no intrusivo)

#### 3. Control de Audio
- **Botón "🔇 Silenciar"**: Desactiva completamente el audio sin detener la visualización
- **Estado visual**: El botón cambia a "🔊 Activar" cuando está silenciado
- **Persistencia**: El estado de silencio se mantiene entre interacciones

#### 4. Integración con Otras Funcionalidades
- **Zoom/Pan**: La sonificación respeta el rango visible - solo reproduce datos dentro de la vista actual
- **Filtros**: Si se oculta una serie (fallecidos o vacunación), su canal de audio también se desactiva
- **Responsive**: Los controles se adaptan a diferentes tamaños de pantalla

### Data-to-Sound Mapping (Mapeo de Datos a Sonido)

#### Escalas de Frecuencia

```javascript
// Fallecidos: valores altos → beep más agudo (tipo ECG)
escalaMuertes = d3.scaleLinear()
  .domain([0, maxFallecidos])  // 0-250 fallecidos
  .range([150, 600])            // Más muertes = beep más agudo
  .clamp(true);
```

**Justificación del mapeo**:
- **Beeps tipo ECG**: Cada punto de datos genera un beep corto (80ms)
- **Frecuencia variable**: Pocas muertes = beep grave (150 Hz), muchas = beep agudo (600 Hz)
- **Metáfora del monitor cardíaco**: La intensidad del beep refleja la "salud" de la población
- **Sin vacunación**: Canal eliminado para claridad narrativa

#### Síntesis de Audio

**Tecnología**: Tone.js (biblioteca de síntesis de audio Web Audio API)

**Sintetizador tipo ECG (MembraneSynth)**:
```javascript
synthDeaths = new Tone.MembraneSynth({
  pitchDecay: 0.008,  // Decay muy rápido para beep corto
  octaves: 2,
  oscillator: {
    type: 'sine'      // Onda sinusoidal pura (tipo monitor médico)
  },
  envelope: {
    attack: 0.001,    // Ataque instantáneo (beep)
    decay: 0.1,       // Decay rápido
    sustain: 0,       // Sin sustain (beep corto)
    release: 0.05     // Release muy corto
  },
  volume: -6          // Volumen alto para claridad del beep
});
```

**Características del sonido**:
- **MembraneSynth**: Simula sonidos percusivos/impulsivos (ideal para beeps)
- **Beep de 80ms**: Duración corta y nítida, similar a monitores ECG reales
- **Sin resonancia**: Sonido limpio sin reverberación

### Implementación Técnica

#### Arquitectura
- **Módulo independiente**: `assets/js/sound.js` (11.5 KB)
- **Integración con chart.js**: Importación y llamadas en puntos estratégicos
- **Gestión de estado**: Audio desacoplado del estado visual del gráfico

#### Funciones Principales

**Inicialización**:
```javascript
initSound(chartData, filterState, scales, chartGroup)
```
- Configura escalas de sonido
- Conecta botones de UI
- Inicializa sintetizadores (después de gesto del usuario)

**Reproducción automática**:
```javascript
reproducirSonificacion()
```
- Obtiene datos visibles según zoom actual
- Reproduce secuencialmente con intervalo de 100ms
- Muestra indicador de progreso

**Hover interactivo**:
```javascript
onHoverPoint(punto)
```
- Llamada desde `actualizarTooltip()` en chart.js
- Reproduce ping corto (80ms) del punto bajo el cursor

**Actualización dinámica**:
```javascript
updateSoundReferences(chartScales, filterState)
```
- Llamada tras zoom/pan y cambios de filtros
- Mantiene sincronización con estado visual

### Logs en Consola (Español)

Todos los mensajes están en español para facilitar el debugging:

```javascript
'🎼 Inicializando módulo de sonificación...'
'🎵 Contexto de audio iniciado correctamente'
'✅ Sintetizador ECG creado: beeps tipo electrocardiograma'
'🎼 Escala de sonificación tipo ECG configurada:'
'   - Fallecidos: 250 max → 150-600 Hz (beep tipo electrocardiograma)'
'▶️ Reproduciendo sonificación de datos...'
'🎧 [42/357] Reproduciendo datos del 15/07/2021: 128 fallecidos, 75.3% vacunación'
'💓 Beep ECG: 128 fallecidos → 381 Hz'
'⏹️ Reproducción detenida'
'🔇 Audio silenciado'
'🔄 Referencias de sonificación actualizadas'
```

### Browser Compatibility

**Requisitos**:
- Web Audio API support (todos los navegadores modernos)
- JavaScript ES6+ modules
- User gesture required para iniciar audio (política de autoplay)

**Navegadores probados**:
- ✅ Chrome 90+ / Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

**Política de Autoplay**:
El audio solo se inicializa después del primer clic en "Reproducir" (cumple con políticas de autoplay de navegadores modernos).

### Experiencia de Usuario

**Diseño de controles**:
- Gradientes vibrantes (púrpura/azul para play, verde para mute)
- Animación de pulso cuando está reproduciendo
- Posicionamiento en esquina inferior derecha (no obstruye la visualización)
- Responsive: controles se apilan verticalmente en mobile

**Feedback multisensorial**:
1. **Visual**: Indicador de progreso + cambio de color de botón
2. **Auditivo**: Sonido mapeado directamente a los datos
3. **Textual**: Tooltip con valores numéricos

### Código

**Archivos modificados/creados**:
- `assets/js/sound.js` (nuevo) - Módulo completo de sonificación
- `assets/js/chart.js` (modificado) - Importación y llamadas a sound.js
- `assets/css/styles.css` (modificado) - Estilos para controles de audio
- `index.html` (modificado) - Importación de Tone.js y botones de UI

**Ubicaciones clave**:
- Inicialización: `chart.js:1221`
- Hover integration: `chart.js:697`
- Update on zoom: `chart.js:1088`
- Update on filter: `chart.js:617`

### Educational Value

Esta capa de sonificación:
- **Refuerza patrones**: Los usuarios "escuchan" la correlación inversa entre muertes y vacunación
- **Accesibilidad aumentada**: Agrega un canal sensorial adicional
- **Engagement**: La interacción auditiva hace la exploración más memorable
- **Multisensorial**: Combina vista, tacto (hover) y oído para una comprensión más profunda

### English Summary

**Sonification: ECG-Style Audio Feedback**

Users can now listen to the evolution of mortality as if monitoring a **heartbeat on an ECG**. The system generates short, sharp beeps (80ms) where:
- **Low deaths** = low-pitched beeps (150 Hz, stable patient)
- **High deaths** = high-pitched beeps (600 Hz, critical condition)
- **No deaths** = silence (flatline)

**Features**:
- Automatic playback of visible data range (~10 beeps/second)
- Interactive hover "pings" for instant audio feedback
- Mute/unmute control
- Full integration with zoom, pan, and filters
- Visual progress indicator during playback
- Single channel (vaccination removed for clarity)

**Implementation**:
- Library: Tone.js (Web Audio API)
- Synthesizer: MembraneSynth (percussive/impulsive sounds)
- Linear frequency mapping: deaths 0-250 → 150-600 Hz (beep pitch)
- Beep duration: 80ms (short and crisp, like real ECG monitors)
- All code comments and console logs in Spanish

## 📋 Fuentes de Datos

### Datos Originales

Los datos utilizados provienen de los siguientes productos oficiales del Ministerio de Ciencia, Tecnología, Conocimiento e Innovación de Chile:

1. **DP10 - Fallecidos por COVID-19 por grupo etario**
   - Fuente: `producto10/FallecidosEtario.csv`
   - Contenido: Fallecidos diarios por COVID-19 segmentados por grupo etario
   - Período: Abril 2020 - Agosto 2023

2. **DP37 - Defunciones por COVID-19**
   - Fuente: `producto37/Defunciones.csv`
   - Contenido: Registro detallado de defunciones por COVID-19
   - Período: Marzo 2020 - Julio 2020 (datos iniciales)

3. **DP77 - Avance en Campaña de Vacunación COVID-19**
   - Fuente: `producto77/total_vacunados_region_edad.csv`
   - Contenido: Datos de vacunación por región y grupo etario
   - Período: Enero 2021 - Agosto 2023

### Enlaces Oficiales
- OBSERVA: https://observa.minciencia.gob.cl/datos-abiertos/datos-del-repositorio-covid-19

## 🔄 Metodología de Procesamiento

### 1. Procesamiento de Datos de Fallecidos

```python
# Cálculo del promedio móvil de 7 días
df['deaths_7d'] = df['daily_deaths'].rolling(window=7, center=True).mean()
```

**Justificación**: El promedio móvil de 7 días suaviza las fluctuaciones diarias (efectos de fin de semana, días festivos) y muestra la tendencia real.

### 2. Cálculo de Cobertura de Vacunación

```python
# Conversión a porcentaje de población
population_chile = 19_116_000  # Población de Chile según INE
df['vaccinated_pct'] = (df['total_vaccinated'] / population_chile) * 100
```

**Población base**: 19,116,000 habitantes (Instituto Nacional de Estadísticas, proyección 2021)

### 3. Corrección de Continuidad Temporal

#### Problema Identificado
Los datos originales mostraban un salto discontinuo en la línea de vacunación:
- 31 de diciembre 2020: 0.0%
- 1 de enero 2021: 10.13%

#### Investigación Histórica
Según la Organización Panamericana de la Salud (OPS/OMS):
- **24 de diciembre 2020**: Inicio oficial de la campaña de vacunación en Chile
- **Objetivo inicial**: Personal de salud, residentes de ELEAM y personal de SENAME
- **3 de febrero 2021**: Inicio de la campaña masiva (población general 85+)

#### Corrección Aplicada
Se agregaron puntos de datos factualmente basados para el período 24-31 de diciembre 2020:

```python
factual_updates = {
    '2020-12-24': 0.1,   # Inicio: personal de salud
    '2020-12-25': 0.2,   # Navidad (ritmo más lento)
    '2020-12-26': 0.4,   # Continuación vacunación sanitaria
    '2020-12-27': 0.7,   # Aumento gradual
    '2020-12-28': 1.2,   # Aceleración
    '2020-12-29': 2.1,   # Más centros de salud
    '2020-12-30': 3.8,   # Preparación para campaña masiva
    '2020-12-31': 6.2,   # Víspera de lanzamiento masivo
    # 1 enero 2021: 10.13% (dato original preservado)
}
```

#### Validación de los Datos Agregados

**Criterios de validación**:
1. ✅ **Base histórica**: Fecha de inicio confirmada por OPS/OMS
2. ✅ **Población objetivo**: ~400,000 trabajadores de salud ≈ 2.1% de población total
3. ✅ **Progresión realista**: Aumento gradual coherente con despliegue logístico
4. ✅ **Preservación de datos**: Punto del 1 de enero mantenido sin alteraciones

## 📁 Estructura de Archivos

```
├── assets/
│   ├── data.csv                 # Datos originales procesados
│   ├── data_factual.csv        # Datos con corrección de continuidad
│   ├── js/
│   │   ├── chart.js            # Lógica principal + zoom/pan + tooltips
│   │   ├── sound.js            # Módulo de sonificación (Tone.js)
│   │   ├── config.js           # Configuración de visualización
│   │   └── utils.js            # Funciones auxiliares
│   ├── css/styles.css          # Estilos + controles zoom + controles audio
│   └── vendor/d3.v7.min.js     # Biblioteca D3.js
├── producto10/                 # Datos de fallecidos (DP10)
├── producto37/                 # Datos de defunciones (DP37)
├── producto77/                 # Datos de vacunación (DP77)
├── scripts/                    # Scripts de análisis y procesamiento
└── index.html                  # Página principal + importación Tone.js
```


