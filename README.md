# COVID-19 en Chile: Fallecidos vs. Vacunación (2020–2023)

Visualización interactiva que narra cómo la cobertura de vacunación disminuyó los fallecidos por COVID-19 en Chile. Combina exploración libre, una narrativa guiada y una capa sonora que refuerza los patrones de los datos.

## Descripción general

La aplicación muestra dos ejes sincronizados:

- **Fallecidos promedio 7 días (eje izquierdo)**: línea roja para población general y líneas adicionales para cada grupo etario seleccionado.
- **Cobertura de vacunación (eje derecho)**: línea azul para población general y trazos punteados para cada grupo etario activo.

El gráfico incluye anotaciones, hitos y etiquetas contextuales que se revelan progresivamente durante la narrativa y la sonificación.

## Características principales

- **Gráfico D3 responsivo** con zoom y paneo horizontal (rango 1x–20x) y helper textual sobre la experiencia de zoom.
- **Comparador de grupos etarios**: desplegable minimalista con siete grupos (≤39 hasta ≥90). La serie general se atenúa cuando hay comparaciones activas.
- **Narrativa guiada**: botón `📖 Narrativa` que enfoca abril–diciembre 2020, reproduce la historia completa (~60 s) y restaura la vista general al finalizar.
- **Sonificación por latidos**: botón `▶ Sonificación` que convierte la curva de fallecidos en pulsos “lub-dub” con BPM dinámico; los filtros quedan bloqueados mientras hay animación.
- **Contexto progresivo**: hitos, anotaciones y cajas de texto se van iluminando a medida que avanza la reproducción para reforzar momentos clave.
- **Tooltips detallados** y resaltado visual sincronizado (marcadores, líneas resaltadas, direct labels adaptativas).
- **Accesibilidad básica**: textos y logs en español, contraste ajustado, controles accesibles vía teclado (focusable buttons).

## Interacciones en detalle

### Zoom y paneo

- Rueda del mouse o gesto táctil para acercar/alejar horizontalmente.
- Arrastre para paneo; el cursor cambia a `grab`/`grabbing`.
- El zoom queda bloqueado automáticamente mientras se reproduce la sonificación o la narrativa.

### Comparación por grupos etarios

- El botón `⚙ Comparar grupos etarios` despliega checkboxes para siete grupos.
- Cada grupo agrega dos líneas nuevas (fallecidos sólidos, vacunación punteada) usando la paleta colorblind-safe definida en `config.js`.
- La línea general se atenúa (30 % opacidad) para destacar las comparaciones.
- Cuando la sonificación o narrativa están activas, los filtros se bloquean y muestran el mensaje `Detén la animación para cambiar filtros`.

### Narrativa y sonificación

- **Sonificación libre (`▶ Sonificación`)**
  - Recorre el rango visible o, si hay filtros, avisa que solo está disponible con población general.
  - Suaviza los datos con ventana de 7 días, calcula BPM dinámico (40–180) y dispara un patrón `lub-dub` con Tone.js.
  - Destaca visualmente la zona actual con líneas resaltadas y marcadores pulsantes.
- **Narrativa guiada (`📖 Narrativa`)**
  - Exige que el comparador esté sin selecciones y fuerza un zoom a abril–diciembre 2020 con transición suave.
  - Reproduce todos los datos desde el inicio, revela anotaciones en orden y apaga la animación tras ~60 s.
  - Al terminar (o al detener manualmente) regresa al zoom completo y desbloquea filtros/zoom.

### Tooltips y detalle bajo demanda

- Tooltip flotante con fecha, fallecidos y % vacunación; se oculta mientras hay reproducción sonora.
- La narrativa reutiliza la misma lógica pero centra visualmente el punto reproducido (`centerOnDate`).
- Las etiquetas directas desaparecen cuando hay zoom profundo (>1.5×) o filtros activos para mantener legibilidad.

### Anotaciones y contexto

- Hitos verticales con etiquetas (“Inicio vacunación”, “Inicio refuerzo”).
- Comentarios de contexto (cajas de color) y anotaciones específicas para eventos como la llegada de Ómicron.
- Todos los elementos relevantes están marcados como `.contextual-element` y son gestionados por `sound.js` para mostrarse progresivamente durante la narrativa.

## Arquitectura del código

- `index.html`: estructura principal, botones de control y carga de scripts ES module.
- `assets/js/chart.js`: inicializa datos D3, construye ejes/series, maneja zoom, filtros, tooltips y expone utilidades (`resetZoom`, `zoomToNarrativeStart`, `setFiltersLocked`).
- `assets/js/sound.js`: módulo de sonificación y narrativa (Tone.js), control de reproducción, bloqueo de filtros y gestión de contexto.
- `assets/js/config.js`: constantes de configuración (colores, milestones, textos, breakpoints).
- `assets/js/utils.js`: utilidades compartidas (formatos, helpers responsivos, debounce, validaciones).
- `assets/css/styles.css`: layout responsivo, estilos de controles, highlight de sonificación y narrativa.
- `assets/data_age_groups.csv`: dataset preparado con población general y series por grupo etario.
- Dependencias externas: `assets/vendor/d3.v7.min.js` y Tone.js (CDN).

## Datos y procesamiento

Los datos provienen de los repositorios oficiales del Ministerio de Ciencia (MinCiencia):

- **DP10** – Fallecidos por COVID-19 por grupo etario (`producto10/FallecidosEtario.csv`).
- **DP77** – Avance campaña de vacunación COVID-19 (`producto77/total_vacunados_region_edad.csv`).
- **DP37** – Defunciones por COVID-19 (utilizado para validaciones históricas).

El archivo principal usado por la visualización es `assets/data_age_groups.csv`, generado mediante:

```bash
python process_age_data.py
```

Este script:

1. Calcula promedios móviles de 7 días de fallecidos por grupo etario.
2. Distribuye porcentajes de vacunación combinando la serie factual (`assets/data_factual.csv`) con factores de priorización por edad.
3. Produce columnas `deaths_<grupo>` y `vaccinated_pct_<grupo>` junto a las series generales (`deaths_7d`, `vaccinated_pct`).

Scripts adicionales (`create_factual_transition.py`, `fix_continuity.py`, `analyze_raw_vaccination.py`, etc.) ayudan a auditar y suavizar la transición de vacunación previa a 2021. Todos usan pandas/numpy; instala dependencias con `pip install pandas numpy`.

## Ejecución local

El proyecto es estático. Para evitar restricciones de módulos ES, sirve la carpeta con un servidor HTTP simple:

```bash
cd /ruta/al/proyecto
python -m http.server 8000
# luego abre http://localhost:8000 en el navegador
```

También puedes usar cualquier servidor estático (Live Server en VS Code, `npx serve`, etc.). No se requiere proceso de build.

## Flujo de trabajo recomendado

- Mantén la consola abierta: todos los logs de zoom/sonificación/narrativa están en español para facilitar el debugging.
- Si ajustas datos o filtros, vuelve a llamar a `process_age_data.py` para regenerar `data_age_groups.csv`.
- Revisa la experiencia en desktop y mobile; los controles se reposicionan y el dropdown pasa a ocupar todo el ancho disponible.
- Antes de publicar, prueba narrativa + sonificación completa para verificar que el zoom se restablece y los filtros se desbloquean.

## Feedback del Profesor e Iteraciones Implementadas

A continuación se documenta el feedback recibido del profesor y las decisiones de implementación tomadas:

### ✅ Cambios Implementados

#### 1. **Botones Directos para Grupos Etarios**
**Feedback:** *"Recomiendo reemplazar el menú desplegable actual por botones directos para los grupos etarios. Esto elimina un clic innecesario y presenta las opciones de forma más intuitiva."*

**Implementación:**
- Se eliminó el botón desplegable `⚙ Comparar grupos etarios`
- Los checkboxes de grupos etarios ahora están **siempre visibles** en la interfaz
- Se mantiene el diseño compacto con checkboxes estilizados que muestran los colores de cada grupo
- Incluye botón "Resetear Filtros" para limpiar todas las selecciones

**Archivos modificados:**
- `index.html`: Estructura HTML de filtros siempre visible
- `assets/css/styles.css`: Estilos para contenedor siempre visible

#### 2. **Visualización con Fondo Gris Transparente**
**Feedback:** *"Cuando se selecciona una edad, la visualización actual se torna confusa y se mezcla con el fondo. Sugiero que, al realizar una selección, el fondo se muestre en un gris claro y transparente."*

**Implementación:**
- Cuando se selecciona uno o más grupos etarios, las líneas de **población general** se muestran en gris (`#999999`) con opacidad muy baja (`0.1`)
- Esto permite ver el contexto general mientras se destacan las líneas de los grupos seleccionados
- Las líneas de grupos etarios seleccionados mantienen sus colores originales con opacidad completa

**Archivos modificados:**
- `assets/js/chart.js`: Lógica condicional en `drawLines()` para aplicar gris/transparente cuando hay filtros activos
- `assets/css/styles.css`: Se eliminaron reglas CSS que forzaban colores específicos para permitir control total desde JavaScript

#### 3. **Paleta Colorblind-Safe**
**Feedback:** *"Eviten el uso de rojo (70-79) y verde (50-59), y consideren paletas de colores más seguras para personas daltónicas."*

**Implementación:**
- Se adoptó la paleta **Paul Tol** colorblind-safe
- Cambios específicos:
  - `50-59`: De verde `#228833` → Naranja/dorado `#DDAA33`
  - `70-79`: De coral rojo `#EE6677` → Marrón rosado `#CC6677`
- Todos los grupos ahora usan colores distinguibles para personas con daltonismo

**Archivos modificados:**
- `assets/js/config.js`: Array `COLORS.ageGroups` actualizado
- `assets/css/styles.css`: Colores de checkboxes actualizados

#### 4. **Eliminación del Botón de Sonificación**
**Feedback:** *"Percibo que el botón de sonificación actual no añade una diferencia significativa, por lo que sugiero eliminarlo y mantener únicamente la narrativa."*

**Implementación:**
- Se eliminó completamente el botón `▶ Sonificación`
- Se mantuvo únicamente el botón `📖 Narrativa` como experiencia principal
- La narrativa integra toda la funcionalidad de sonificación (heartbeat + tono de vacunación + voz en off)

**Archivos modificados:**
- `index.html`: Eliminado botón de sonificación del DOM
- `assets/css/styles.css`: Limpieza de estilos relacionados

#### 5. **Voz en Off Narrativa**
**Feedback:** *"La narrativa podría enriquecerse. Por ejemplo, se podría integrar una voz en off que indique momentos clave, como 'comienzan los muertos', 'cuarentena total generalizada' o 'inicio de vacunación'."*

**Implementación:**
- Sistema completo de **voz en off usando Web Speech API**
- Voz masculina en español latinoamericano (prioriza voces de es-MX, es-CL, es-AR, etc.)
- Narración anticipada: la voz se activa **antes** de que aparezcan las anotaciones visuales para mejor sincronización
  - Elementos regulares: 3 días de anticipación
  - Ómicron: 12 días de anticipación (por el pico rápido)
- Textos narrativos contextualizados:
  - *"Marzo de 2020. Comienza la pandemia de COVID-19 en Chile"* (narración inicial)
  - *"Se establece la cuarentena total generalizada"*
  - *"Comienza la campaña masiva de vacunación"*
  - *"Período de baja vacunación y la cepa Gamma"*
  - *"Comienza la dosis de refuerzo"*
  - *"La población alcanza entre 40 y 60 por ciento con una dosis..."*
  - *"Aparece la nueva cepa Ómicron..."*
- Configuración de voz: rate `1.05`, pitch `0.95`, volume `1.0` (máximo para destacar)
- Sistema robusto que maneja dataset reducido (~120 puntos) verificando rangos entre puntos consecutivos

**Archivos modificados:**
- `assets/js/sound.js`: Funciones completas de síntesis de voz, generación de textos narrativos, sincronización con elementos contextuales

#### 6. **Sonido para Vacunación (Tono Ascendente)**
**Feedback:** *"Sería interesante complementar esto incorporando otro sonido al inicio de las vacunaciones, quizás un tono ascendente que aumente a medida que progresa la vacunación. La combinación de ritmo (fallecidos) y tono (vacunación) podría funcionar muy bien."*

**Implementación:**
- Sintetizador tonal continuo usando `Tone.Synth` con onda sinusoidal suave
- Frecuencia asciende de **C4 (261.63 Hz) a C6 (1046.50 Hz)** mapeando 0-100% de vacunación
- Tono **verdaderamente continuo** (no por beats):
  - Usa `triggerAttack()` sin release automático
  - Transiciones suaves con `frequency.rampTo()` (1.5 segundos)
  - Envelope: `attack: 0.1`, `decay: 0.0`, `sustain: 1`, `release: 2.5`
- Tono se inicia **solo cuando vacunación > 0%**, permanece silencioso en 0%
- Volumen bajo (`-20 dB`) para funcionar como "fondo" del heartbeat y la voz
- Reverb ligero (20% wet) para profundidad

**Archivos modificados:**
- `assets/js/sound.js`: Sintetizador de vacunación, funciones de control de tono continuo

### ❌ Cambios NO Implementados (con Justificación)

#### 1. **Direct Labels para Líneas de Grupos Etarios**
**Feedback:** *"Al seleccionar una edad, sería más claro posicionar las leyendas directamente cerca de cada línea, utilizando 'direct labels'."*

**Justificación para NO implementar:**
- Cuando se activan **múltiples grupos etarios simultáneamente** (especialmente los 7), las líneas de fallecidos tienden a superponerse significativamente
- Direct labels en líneas superpuestas crearían **clutter visual** y dificultarían la lectura
- La solución actual (checkboxes con colores + tooltip interactivo) proporciona:
  - Identificación clara del color de cada grupo
  - Información precisa bajo demanda vía tooltip
  - Interfaz limpia incluso con todos los filtros activos

**Decisión:** Mantener la identificación por colores en checkboxes + tooltips interactivos.

#### 2. **Eliminación Completa de Zoom y Panning**
**Feedback:** *"Zoom y deslizar me parece realmente no necesario, no agrega nada. Lo sacaría completamente."*

**Justificación para NO implementar:**
- El zoom/panning es **muy útil cuando múltiples grupos etarios están activos**:
  - Permite inspeccionar períodos específicos donde las líneas se superponen
  - Facilita el análisis detallado de divergencias entre grupos
  - Ayuda a explorar picos y valles en rangos temporales reducidos
- La narrativa automáticamente maneja el zoom (focus inicial + reset final), por lo que no interfiere con la experiencia guiada
- Para usuarios que solo usan la narrativa, el zoom nunca se interpone (se bloquea durante reproducción)
- Casos de uso válidos:
  - Comparar exactamente cuándo cada grupo alcanzó cierto % de vacunación
  - Analizar la magnitud relativa de picos de fallecidos por grupo en olas específicas

**Decisión:** Mantener zoom/panning como característica opcional para análisis exploratorio avanzado.

### Resumen de Implementación

De **6 recomendaciones principales** del profesor:
- ✅ **6 implementadas completamente** (botones directos, fondo gris, paleta colorblind, eliminación de sonificación simple, voz en off, tono de vacunación)
- ❌ **2 no implementadas por razones técnicas/UX** (direct labels, eliminación de zoom)

El resultado es una narrativa **significativamente enriquecida** que combina:
- 🎙️ **Voz en off dramática** narrando momentos clave
- 💓 **Heartbeat dinámico** (65-200 BPM) reflejando fallecidos
- 🎵 **Tono ascendente continuo** (C4-C6) reflejando progreso de vacunación
- 🎨 **Visualización accesible** con paleta colorblind-safe y controles intuitivos

## Créditos y fuentes

- Datos: Observatorio Social del Ministerio de Ciencia, Tecnología, Conocimiento e Innovación de Chile — https://observa.minciencia.gob.cl/
- Sonificación: Tone.js (MIT License).
- Visualización: D3.js v7.
- Voz en off: Web Speech API (navegador).

---

### English summary (short)

This project visualises the inverse relationship between COVID-19 deaths and vaccination coverage in Chile (2020–2023). It offers zoom/pan, an age-group comparison dropdown, contextual annotations, and a heartbeat-inspired sonification. A narrative mode zooms into the pandemic onset, plays the full story, highlights contextual notes, and restores the default view once playback stops. Data is preprocessed into `assets/data_age_groups.csv`; run `python process_age_data.py` to refresh it.

---

## Physicalization (tilt-to-tooltip) & Remote Control

- **sensor.html** (root): mobile page that sends a normalized tilt parameter `t∈[0,1]` via Firebase Realtime Database (`fisicalizacion/t`). Flat phone ≈ `t=0`; tilt toward ~60° ≈ `t=1`.
- **index.html**: listens to Firebase updates and calls `updateVaccinationDetail(t)`. Includes a fixed QR (top-left) pointing to `https://clemoacevedo.github.io/infovis/sensor.html` for quick pairing.
- **assets/js/chart.js**: appended `updateVaccinationDetail(t)` hook to drive the existing tooltip/guide line/markers without altering mouse interactions, filters, zoom, or sound flows.

## Physical Sonification (tilt-driven)

- **assets/js/physical-sound.js**: compact Tone.js-based cue triggered by `updateVaccinationDetail(t)`; uses a soft filtered triangle MonoSynth (pillowy “dose” beep), no hiss, volume-safe. Autogates until the user interacts (browser autoplay policy). Narrative audio remains untouched.
