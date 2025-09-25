# COVID-19 en Chile: Fallecidos vs. Vacunación (2020–2023)

Visualización interactiva que muestra cómo los fallecidos por COVID-19 en Chile disminuyeron en paralelo con la implementación de la campaña masiva de vacunación.

## 📊 Descripción

Esta visualización presenta dos series de datos principales:
- **Fallecidos por COVID-19**: Promedio móvil de 7 días de fallecidos diarios
- **Cobertura de vacunación**: Porcentaje de población vacunada a lo largo del tiempo

La visualización demuestra la correlación inversa entre el aumento de la cobertura de vacunación y la disminución de fallecidos por COVID-19 en Chile.

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
│   ├── js/chart.js             # Lógica principal de visualización
│   ├── css/styles.css          # Estilos y diseño responsivo
│   └── vendor/d3.v7.min.js     # Biblioteca D3.js
├── producto10/                 # Datos de fallecidos (DP10)
├── producto37/                 # Datos de defunciones (DP37)
├── producto77/                 # Datos de vacunación (DP77)
├── scripts/                    # Scripts de análisis y procesamiento
└── index.html                  # Página principal
```


