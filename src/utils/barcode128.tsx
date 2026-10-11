import React from 'react';

// Code 128 (Subset B) pattern table (widths of: bar, space, bar, space, bar, space)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 100-106 (106 is STOP: 7 digits)
];

const START_B = 104;
const STOP = 106;

/**
 * Encodes ASCII string into Code 128B modules (1 for bar, 0 for space)
 */
export function encodeCode128B(text: string): { modules: boolean[]; valid: boolean } {
  if (!text) return { modules: [], valid: false };

  const values: number[] = [START_B];
  let checksum = START_B;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    // Code 128B maps ASCII 32..127 to values 0..95
    if (code < 32 || code > 127) {
      // replace unencodable chars with space (value 0)
      values.push(0);
      checksum += 0 * (i + 1);
    } else {
      const val = code - 32;
      values.push(val);
      checksum += val * (i + 1);
    }
  }

  const checkVal = checksum % 103;
  values.push(checkVal);
  values.push(STOP);

  const modules: boolean[] = [];

  values.forEach((val) => {
    const pattern = CODE128_PATTERNS[val] || CODE128_PATTERNS[0];
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  });

  // Quiet zones (10 modules at start and end)
  const quietZone = new Array(10).fill(false);
  return {
    modules: [...quietZone, ...modules, ...quietZone],
    valid: true,
  };
}

interface BarcodeProps {
  value: string;
  height?: number;
  barWidth?: number;
  showText?: boolean;
  className?: string;
}

export const Barcode128: React.FC<BarcodeProps> = ({
  value,
  height = 50,
  barWidth = 1.6,
  showText = true,
  className = '',
}) => {
  const { modules, valid } = encodeCode128B(value);

  if (!valid || modules.length === 0) {
    return <div className="text-xs text-red-500 font-mono">Código inválido</div>;
  }

  const totalWidth = modules.length * barWidth;
  const svgHeight = showText ? height + 16 : height;

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={totalWidth}
        height={svgHeight}
        viewBox={`0 0 ${totalWidth} ${svgHeight}`}
        className="overflow-visible"
        shapeRendering="crispEdges"
      >
        <rect width={totalWidth} height={height} fill="#FFFFFF" />
        {modules.map((isBar, idx) => {
          if (!isBar) return null;
          return (
            <rect
              key={idx}
              x={idx * barWidth}
              y={0}
              width={barWidth}
              height={height}
              fill="#000000"
            />
          );
        })}
        {showText && (
          <text
            x={totalWidth / 2}
            y={height + 12}
            textAnchor="middle"
            fill="#1E293B"
            fontSize="10"
            fontFamily="monospace"
            letterSpacing="1.5"
            fontWeight="600"
          >
            {value}
          </text>
        )}
      </svg>
    </div>
  );
};
