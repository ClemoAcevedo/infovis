/**
 * Configuration constants for COVID-19 Chile visualization
 */

// Chart dimensions and margins
export const CHART_CONFIG = {
  width: 720,
  height: 400,
  margin: {
    top: 56,
    right: 92,
    bottom: 65,
    left: 56
  }
};

// Colors (refined for minimalism)
export const COLORS = {
  deaths: '#d62728',
  vaccination: '#1f77b4',
  grid: '#999',
  text: '#555',
  milestone: {
    primary: '#AAA',
    secondary: '#BBB',
    tertiary: '#CCC'
  }
};

// Typography
export const TYPOGRAPHY = {
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  fontSize: {
    title: '24px',
    subtitle: '16px',
    label: '12px',
    source: '11px',
    milestone: '11px'
  }
};

// Line styles (refined)
export const LINE_STYLES = {
  deaths: {
    strokeWidth: 1.8,
    strokeOpacity: 0.8
  },
  vaccination: {
    strokeWidth: 1.8,
    strokeOpacity: 0.8
  },
  // Responsive adjustments
  mobile: {
    deaths: {
      strokeWidth: 1.5,
      strokeOpacity: 0.75
    }
  }
};

// Milestone data with styling (simplified)
export const MILESTONES = [
  {
    date: '2021-02-03',
    label: 'Inicio de vacunación',
    style: 'primary',
    strokeWidth: 1,
    dashArray: '2,3',
    yOffset: -30
  },
  {
    date: '2021-08-11',
    label: 'Inicio de refuerzo',
    style: 'secondary',
    strokeWidth: 1,
    dashArray: '2,3',
    yOffset: -45
  },
  {
    date: '2022-01-15',
    label: 'Ola Ómicron',
    style: 'tertiary',
    strokeWidth: 1,
    dashArray: '2,3',
    yOffset: -30
  }
];

// Text content
export const CONTENT = {
  title: 'COVID-19 en Chile: Fallecidos vs. Vacunación (2020–2023)',
  subtitle: 'Las muertes disminuyeron en paralelo con la implementación de la campaña masiva de vacunación (promedio 7 días).',
  source: 'Fuente: MinCiencia y MINSAL — DP37, DP77 (DP10 opcional).',
  ariaLabel: 'Gráfico de líneas que muestra cómo los fallecidos por COVID-19 en Chile disminuyen a medida que aumenta el porcentaje de vacunados entre 2020 y 2023.',
  labels: {
    deaths: 'Fallecidos (promedio 7 días)',
    vaccination: '% Vacunados'
  },
  annotation: {
    text1: 'Descenso posterior',
    text2: 'a vacunación',
    date: '2021-10-01'
  },
  caption: 'Este gráfico muestra la evolución temporal de los fallecidos por COVID-19 (línea roja, promedio móvil de 7 días) y el porcentaje de población vacunada (línea azul) en Chile desde 2020 hasta 2023. Se observa una clara disminución de las muertes tras el inicio de la campaña masiva de vacunación.'
};

// Responsive breakpoints
export const BREAKPOINTS = {
  mobile: 480
};

// Animation settings
export const ANIMATION = {
  duration: 750,
  easing: 'ease-in-out'
};