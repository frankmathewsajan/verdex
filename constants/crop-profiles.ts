export interface CropProfile {
  id: string;
  name: string;
  emoji: string;
  ranges: {
    nitrogen: {
      red: { min: number; max: number }[];
      yellow: { min: number; max: number }[];
      green: { min: number; max: number };
    };
    phosphorus: {
      red: { min: number; max: number }[];
      yellow: { min: number; max: number }[];
      green: { min: number; max: number };
    };
    potassium: {
      red: { min: number; max: number }[];
      yellow: { min: number; max: number }[];
      green: { min: number; max: number };
    };
    ph: {
      red: { min: number; max: number }[];
      yellow: { min: number; max: number }[];
      green: { min: number; max: number };
    };
    moisture: {
      red: { min: number; max: number }[];
      yellow: { min: number; max: number }[];
      green: { min: number; max: number };
    };
    temperature: {
      red: { min: number; max: number }[];
      yellow: { min: number; max: number }[];
      green: { min: number; max: number };
    };
  };
  importance: {
    nitrogen: 'low' | 'medium' | 'high' | 'very-high';
    phosphorus: 'low' | 'medium' | 'high' | 'very-high';
    potassium: 'low' | 'medium' | 'high' | 'very-high';
  };
}

export const CROP_PROFILES: CropProfile[] = [
  {
    id: 'general',
    name: 'General Soil',
    emoji: '🌱',
    ranges: {
      nitrogen: {
        green: { min: 200, max: 400 },
        yellow: [
          { min: 150, max: 199 },
          { min: 401, max: 500 },
        ],
        red: [
          { min: 0, max: 149 },
          { min: 501, max: 600 },
        ],
      },
      phosphorus: {
        green: { min: 40, max: 60 },
        yellow: [
          { min: 25, max: 39 },
          { min: 61, max: 80 },
        ],
        red: [
          { min: 0, max: 24 },
          { min: 81, max: 150 },
        ],
      },
      potassium: {
        green: { min: 150, max: 300 },
        yellow: [
          { min: 100, max: 149 },
          { min: 301, max: 400 },
        ],
        red: [
          { min: 0, max: 99 },
          { min: 401, max: 600 },
        ],
      },
      ph: {
        green: { min: 6.0, max: 7.5 },
        yellow: [
          { min: 5.5, max: 5.9 },
          { min: 7.6, max: 8.0 },
        ],
        red: [
          { min: 0, max: 5.4 },
          { min: 8.1, max: 14 },
        ],
      },
      moisture: {
        green: { min: 40, max: 60 },
        yellow: [
          { min: 30, max: 39 },
          { min: 61, max: 75 },
        ],
        red: [
          { min: 0, max: 29 },
          { min: 76, max: 100 },
        ],
      },
      temperature: {
        green: { min: 20, max: 30 },
        yellow: [
          { min: 15, max: 19 },
          { min: 31, max: 35 },
        ],
        red: [
          { min: -10, max: 14 },
          { min: 36, max: 50 },
        ],
      },
    },
    importance: {
      nitrogen: 'high',
      phosphorus: 'high',
      potassium: 'high',
    },
  },
  {
    id: 'paddy',
    name: 'Paddy (Rice)',
    emoji: '🌾',
    ranges: {
      nitrogen: {
        green: { min: 250, max: 450 },
        yellow: [
          { min: 180, max: 249 },
          { min: 451, max: 550 },
        ],
        red: [
          { min: 0, max: 179 },
          { min: 551, max: 600 },
        ],
      },
      phosphorus: {
        green: { min: 35, max: 55 },
        yellow: [
          { min: 20, max: 34 },
          { min: 56, max: 75 },
        ],
        red: [
          { min: 0, max: 19 },
          { min: 76, max: 150 },
        ],
      },
      potassium: {
        green: { min: 180, max: 350 },
        yellow: [
          { min: 120, max: 179 },
          { min: 351, max: 450 },
        ],
        red: [
          { min: 0, max: 119 },
          { min: 451, max: 600 },
        ],
      },
      ph: {
        green: { min: 5.5, max: 7.0 },
        yellow: [
          { min: 5.0, max: 5.4 },
          { min: 7.1, max: 7.5 },
        ],
        red: [
          { min: 0, max: 4.9 },
          { min: 7.6, max: 14 },
        ],
      },
      moisture: {
        green: { min: 50, max: 70 },
        yellow: [
          { min: 40, max: 49 },
          { min: 71, max: 85 },
        ],
        red: [
          { min: 0, max: 39 },
          { min: 86, max: 100 },
        ],
      },
      temperature: {
        green: { min: 22, max: 32 },
        yellow: [
          { min: 18, max: 21 },
          { min: 33, max: 37 },
        ],
        red: [
          { min: -10, max: 17 },
          { min: 38, max: 50 },
        ],
      },
    },
    importance: {
      nitrogen: 'high',
      phosphorus: 'medium',
      potassium: 'high',
    },
  },
  {
    id: 'cotton',
    name: 'Cotton',
    emoji: '☁️',
    ranges: {
      nitrogen: {
        green: { min: 220, max: 420 },
        yellow: [
          { min: 160, max: 219 },
          { min: 421, max: 520 },
        ],
        red: [
          { min: 0, max: 159 },
          { min: 521, max: 600 },
        ],
      },
      phosphorus: {
        green: { min: 38, max: 58 },
        yellow: [
          { min: 22, max: 37 },
          { min: 59, max: 78 },
        ],
        red: [
          { min: 0, max: 21 },
          { min: 79, max: 150 },
        ],
      },
      potassium: {
        green: { min: 200, max: 400 },
        yellow: [
          { min: 140, max: 199 },
          { min: 401, max: 500 },
        ],
        red: [
          { min: 0, max: 139 },
          { min: 501, max: 600 },
        ],
      },
      ph: {
        green: { min: 6.0, max: 7.5 },
        yellow: [
          { min: 5.5, max: 5.9 },
          { min: 7.6, max: 8.0 },
        ],
        red: [
          { min: 0, max: 5.4 },
          { min: 8.1, max: 14 },
        ],
      },
      moisture: {
        green: { min: 35, max: 55 },
        yellow: [
          { min: 25, max: 34 },
          { min: 56, max: 70 },
        ],
        red: [
          { min: 0, max: 24 },
          { min: 71, max: 100 },
        ],
      },
      temperature: {
        green: { min: 21, max: 32 },
        yellow: [
          { min: 16, max: 20 },
          { min: 33, max: 38 },
        ],
        red: [
          { min: -10, max: 15 },
          { min: 39, max: 50 },
        ],
      },
    },
    importance: {
      nitrogen: 'high',
      phosphorus: 'medium',
      potassium: 'very-high',
    },
  },
  {
    id: 'tomato',
    name: 'Tomato',
    emoji: '🍅',
    ranges: {
      nitrogen: {
        green: { min: 180, max: 350 },
        yellow: [
          { min: 130, max: 179 },
          { min: 351, max: 450 },
        ],
        red: [
          { min: 0, max: 129 },
          { min: 451, max: 600 },
        ],
      },
      phosphorus: {
        green: { min: 45, max: 70 },
        yellow: [
          { min: 30, max: 44 },
          { min: 71, max: 90 },
        ],
        red: [
          { min: 0, max: 29 },
          { min: 91, max: 150 },
        ],
      },
      potassium: {
        green: { min: 190, max: 360 },
        yellow: [
          { min: 130, max: 189 },
          { min: 361, max: 460 },
        ],
        red: [
          { min: 0, max: 129 },
          { min: 461, max: 600 },
        ],
      },
      ph: {
        green: { min: 6.0, max: 6.8 },
        yellow: [
          { min: 5.5, max: 5.9 },
          { min: 6.9, max: 7.2 },
        ],
        red: [
          { min: 0, max: 5.4 },
          { min: 7.3, max: 14 },
        ],
      },
      moisture: {
        green: { min: 40, max: 65 },
        yellow: [
          { min: 30, max: 39 },
          { min: 66, max: 80 },
        ],
        red: [
          { min: 0, max: 29 },
          { min: 81, max: 100 },
        ],
      },
      temperature: {
        green: { min: 18, max: 28 },
        yellow: [
          { min: 13, max: 17 },
          { min: 29, max: 33 },
        ],
        red: [
          { min: -10, max: 12 },
          { min: 34, max: 50 },
        ],
      },
    },
    importance: {
      nitrogen: 'high',
      phosphorus: 'high',
      potassium: 'high',
    },
  },
  {
    id: 'chili',
    name: 'Chili',
    emoji: '🌶️',
    ranges: {
      nitrogen: {
        green: { min: 190, max: 370 },
        yellow: [
          { min: 135, max: 189 },
          { min: 371, max: 470 },
        ],
        red: [
          { min: 0, max: 134 },
          { min: 471, max: 600 },
        ],
      },
      phosphorus: {
        green: { min: 40, max: 65 },
        yellow: [
          { min: 28, max: 39 },
          { min: 66, max: 85 },
        ],
        red: [
          { min: 0, max: 27 },
          { min: 86, max: 150 },
        ],
      },
      potassium: {
        green: { min: 180, max: 350 },
        yellow: [
          { min: 125, max: 179 },
          { min: 351, max: 450 },
        ],
        red: [
          { min: 0, max: 124 },
          { min: 451, max: 600 },
        ],
      },
      ph: {
        green: { min: 6.0, max: 7.0 },
        yellow: [
          { min: 5.5, max: 5.9 },
          { min: 7.1, max: 7.5 },
        ],
        red: [
          { min: 0, max: 5.4 },
          { min: 7.6, max: 14 },
        ],
      },
      moisture: {
        green: { min: 38, max: 62 },
        yellow: [
          { min: 28, max: 37 },
          { min: 63, max: 78 },
        ],
        red: [
          { min: 0, max: 27 },
          { min: 79, max: 100 },
        ],
      },
      temperature: {
        green: { min: 20, max: 30 },
        yellow: [
          { min: 15, max: 19 },
          { min: 31, max: 35 },
        ],
        red: [
          { min: -10, max: 14 },
          { min: 36, max: 50 },
        ],
      },
    },
    importance: {
      nitrogen: 'high',
      phosphorus: 'medium',
      potassium: 'high',
    },
  },
  {
    id: 'maize',
    name: 'Maize (Corn)',
    emoji: '🌽',
    ranges: {
      nitrogen: {
        green: { min: 280, max: 500 },
        yellow: [
          { min: 200, max: 279 },
          { min: 501, max: 600 },
        ],
        red: [
          { min: 0, max: 199 },
          { min: 601, max: 700 },
        ],
      },
      phosphorus: {
        green: { min: 48, max: 75 },
        yellow: [
          { min: 32, max: 47 },
          { min: 76, max: 95 },
        ],
        red: [
          { min: 0, max: 31 },
          { min: 96, max: 150 },
        ],
      },
      potassium: {
        green: { min: 210, max: 400 },
        yellow: [
          { min: 150, max: 209 },
          { min: 401, max: 520 },
        ],
        red: [
          { min: 0, max: 149 },
          { min: 521, max: 600 },
        ],
      },
      ph: {
        green: { min: 6.0, max: 7.2 },
        yellow: [
          { min: 5.5, max: 5.9 },
          { min: 7.3, max: 7.8 },
        ],
        red: [
          { min: 0, max: 5.4 },
          { min: 7.9, max: 14 },
        ],
      },
      moisture: {
        green: { min: 45, max: 70 },
        yellow: [
          { min: 35, max: 44 },
          { min: 71, max: 85 },
        ],
        red: [
          { min: 0, max: 34 },
          { min: 86, max: 100 },
        ],
      },
      temperature: {
        green: { min: 20, max: 30 },
        yellow: [
          { min: 15, max: 19 },
          { min: 31, max: 35 },
        ],
        red: [
          { min: -10, max: 14 },
          { min: 36, max: 50 },
        ],
      },
    },
    importance: {
      nitrogen: 'very-high',
      phosphorus: 'high',
      potassium: 'high',
    },
  },
  {
    id: 'pulses',
    name: 'Pulses',
    emoji: '🫘',
    ranges: {
      nitrogen: {
        green: { min: 100, max: 250 },
        yellow: [
          { min: 60, max: 99 },
          { min: 251, max: 350 },
        ],
        red: [
          { min: 0, max: 59 },
          { min: 351, max: 600 },
        ],
      },
      phosphorus: {
        green: { min: 50, max: 80 },
        yellow: [
          { min: 35, max: 49 },
          { min: 81, max: 100 },
        ],
        red: [
          { min: 0, max: 34 },
          { min: 101, max: 150 },
        ],
      },
      potassium: {
        green: { min: 140, max: 280 },
        yellow: [
          { min: 100, max: 139 },
          { min: 281, max: 380 },
        ],
        red: [
          { min: 0, max: 99 },
          { min: 381, max: 600 },
        ],
      },
      ph: {
        green: { min: 5.5, max: 7.2 },
        yellow: [
          { min: 5.0, max: 5.4 },
          { min: 7.3, max: 8.0 },
        ],
        red: [
          { min: 0, max: 4.9 },
          { min: 8.1, max: 14 },
        ],
      },
      moisture: {
        green: { min: 35, max: 55 },
        yellow: [
          { min: 25, max: 34 },
          { min: 56, max: 70 },
        ],
        red: [
          { min: 0, max: 24 },
          { min: 71, max: 100 },
        ],
      },
      temperature: {
        green: { min: 18, max: 28 },
        yellow: [
          { min: 13, max: 17 },
          { min: 29, max: 33 },
        ],
        red: [
          { min: -10, max: 12 },
          { min: 34, max: 50 },
        ],
      },
    },
    importance: {
      nitrogen: 'low',
      phosphorus: 'high',
      potassium: 'medium',
    },
  },
];

/**
 * Get the quality zone (red/yellow/green) and fill percentage for a parameter value
 */
export const getParameterHealth = (
  value: number,
  parameterName: keyof CropProfile['ranges'],
  cropProfile: CropProfile
): { zone: 'red' | 'yellow' | 'green'; fillPercentage: number; color: string } => {
  const ranges = cropProfile.ranges[parameterName];

  // Check green zone first
  if (value >= ranges.green.min && value <= ranges.green.max) {
    const rangeSize = ranges.green.max - ranges.green.min;
    const position = value - ranges.green.min;
    const fillPercentage = rangeSize > 0 ? (position / rangeSize) * 100 : 50;
    return {
      zone: 'green',
      fillPercentage: Math.max(20, Math.min(100, fillPercentage)),
      color: '#22c55e',
    };
  }

  // Check yellow zones
  for (const yellowRange of ranges.yellow) {
    if (value >= yellowRange.min && value <= yellowRange.max) {
      const rangeSize = yellowRange.max - yellowRange.min;
      const position = value - yellowRange.min;
      const fillPercentage = rangeSize > 0 ? (position / rangeSize) * 100 : 50;
      return {
        zone: 'yellow',
        fillPercentage: Math.max(20, Math.min(100, fillPercentage)),
        color: '#eab308',
      };
    }
  }

  // Otherwise it's in red zone
  let fillPercentage = 50;
  for (const redRange of ranges.red) {
    if (value >= redRange.min && value <= redRange.max) {
      const rangeSize = redRange.max - redRange.min;
      const position = value - redRange.min;
      fillPercentage = rangeSize > 0 ? (position / rangeSize) * 100 : 50;
      break;
    }
  }

  return {
    zone: 'red',
    fillPercentage: Math.max(20, Math.min(100, fillPercentage)),
    color: '#dc2626',
  };
};

/**
 * Get crop profile by ID
 */
export const getCropProfileById = (cropId: string): CropProfile => {
  return CROP_PROFILES.find((profile) => profile.id === cropId) || CROP_PROFILES[0];
};
