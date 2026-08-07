# COVID-19 en Chile: fallecidos y vacunación

Visualización interactiva de la relación entre fallecidos por COVID-19 y cobertura de vacunación en Chile entre 2020 y 2023. Incluye comparación por grupo etario, narrativa guiada, anotaciones contextuales, sonificación y un control físico opcional mediante la inclinación de un celular.

## Ejecutar localmente

El proyecto es estático y no requiere build:

```bash
python -m http.server 8000
```

Luego abre <http://localhost:8000>. También puedes usar Live Server u otro servidor estático. Los scripts de procesamiento requieren `pandas` y `numpy`.

## Estructura principal

- `index.html`: visualización principal y conexión con el control físico.
- `sensor.html`: página móvil que envía la inclinación del dispositivo.
- `assets/js/chart.js`: gráfico D3, zoom, filtros, tooltips y actualización remota.
- `assets/js/sound.js`: narrativa, voz en off y sonificación.
- `assets/js/physical-sound.js`: sonido breve asociado al control físico.
- `assets/js/config.js`: colores, hitos y textos de la visualización.
- `assets/js/firebase-config.js`: configuración pública compartida de Firebase.
- `assets/data_age_groups.csv`: dataset principal utilizado por la aplicación.
- `producto10/`, `producto37/`, `producto77/`: datos fuente y resultados intermedios.

## Datos

Los datos provienen del Observatorio Social de MinCiencia:

- DP10: fallecidos por grupo etario.
- DP77: avance de vacunación por región y edad.
- DP37: defunciones, utilizado para validaciones históricas.

Para regenerar el dataset principal:

```bash
python process_age_data.py
```

## Control físico y Firebase

`sensor.html` escribe el valor normalizado de inclinación en `fisicalizacion/t`; `index.html` lo escucha para mover el detalle de vacunación. La configuración de Firebase es deliberadamente de cliente: una `apiKey` de Firebase no es una contraseña y puede aparecer en el código publicado.

Antes de publicar, configura en Firebase/Google Cloud:

1. Restricción HTTP por dominio para la API key.
2. Reglas de Realtime Database que limiten exactamente las lecturas y escrituras necesarias.
3. App Check y su enforcement si la experiencia pública lo permite.
4. Rotación de la key si estuvo sin restricciones o si se usó fuera de este proyecto.

La key también aparece en commits anteriores del repositorio. Borrarla del README o moverla a otro archivo no la elimina del historial; si estuvo expuesta sin restricciones, rótala desde Google Cloud Console.

## Créditos

- Datos: <https://observa.minciencia.gob.cl/>
- Visualización: D3.js v7.
- Sonificación: Tone.js (MIT License).
- Voz: Web Speech API.
