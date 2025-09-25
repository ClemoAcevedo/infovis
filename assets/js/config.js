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
    label: ['Inicio', 'Vacunación'],
    style: 'primary',
    strokeWidth: 1,
    dashArray: '2,3',
    yOffset: -40
  },
  {
    date: '2021-08-11',
    label: ['Inicio', 'Refuerzo'],
    style: 'secondary',
    strokeWidth: 1,
    dashArray: '2,3',
    yOffset: -40
  }
];

// Text content
export const CONTENT = {
  title: 'COVID-19 en Chile: Fallecidos vs. Vacunación (2020–2023)',
  subtitle: 'Las muertes disminuyeron en paralelo con la implementación de la campaña masiva de vacunación (promedio 7 días).',
  source: 'Fuente: MinCiencia y MINSAL — DP37, DP77 (DP10 opcional).',
  ariaLabel: 'Gráfico de líneas que muestra cómo los fallecidos por COVID-19 en Chile disminuyen a medida que aumenta el porcentaje de vacunados entre 2020 y 2023.',
  labels: {
    deaths: 'Fallecidos (a 7 días)',
    vaccination: '% Vacunados'
  },
  annotation: {
    text1: 'Descenso posterior',
    text2: 'a vacunación',
    date: '2021-10-01'
  },
  omicronAnnotation: {
    text: ['La nueva cepa Ómicron,', 'altamente contagiosa y' , 'con múltiples mutaciones'],
    date: '2022-03-01'
  },
  vaccinationJumpAnnotation: {
    text: 'Inicio campaña masiva',
    date: '2021-02-03'
  },
  firstAnnotation: {
    text: ['Salto inicial de cobertura:', 'primeras dosis a grupos', 'prioritarios y carga histórica',],
    date: '2020-12-25'
  },
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

export const COMMENTS = [
  {
    id: 'yellow',
    // Centro del recuadro amarillo (zona baja a fines 2020–inicios 2021)
    date: '2020-07-15',      // mueve esta fecha si necesitas desplazar en X
    yType: 'left',           // usa eje izquierdo (fallecidos)
    yValue: 24,              // mueve este valor si necesitas subir/bajar el texto
    anchor: 'start',         // start | middle | end
    dx: 0,                   // ajuste fino en X (px)
    dy: 0,                   // ajuste fino en Y (px)
    text: [
      'Cuarentena total',
      'generalizada'
    ]
  },
  {
    id: 'blue',
    // Centro del recuadro azul (meses medios de 2021, rebrote)
    date: '2021-03-15', // se usa el centro del rango
    yType: 'left',
    yValue: 135,
    anchor: 'middle',
    dx: 0,
    dy: -10,
    text: [
      'Baja vacunación', 
      'y cepa Gamma'
    ]
  },
  {
    id: 'violet',
    // Centro del recuadro violeta (fines 2021, pre-Ómicron)
    date: '2021-11-10',
    yType: 'left',
    yValue: 90,
    anchor: 'middle',
    dx: 0,
    dy: 6,
    text: [
      '40–60% con 1 dosis', 
      'e inmunidad natural'
    ]
  }
];