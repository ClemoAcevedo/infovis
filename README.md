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

## Créditos y fuentes

- Datos: Observatorio Social del Ministerio de Ciencia, Tecnología, Conocimiento e Innovación de Chile — https://observa.minciencia.gob.cl/
- Sonificación: Tone.js (MIT License).
- Visualización: D3.js v7.

---

### English summary (short)

This project visualises the inverse relationship between COVID-19 deaths and vaccination coverage in Chile (2020–2023). It offers zoom/pan, an age-group comparison dropdown, contextual annotations, and a heartbeat-inspired sonification. A narrative mode zooms into the pandemic onset, plays the full story, highlights contextual notes, and restores the default view once playback stops. Data is preprocessed into `assets/data_age_groups.csv`; run `python process_age_data.py` to refresh it.
