import React, { useState } from 'react';

export interface PieSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
}

interface PieChartWidgetProps {
  data: PieSegment[];
  size?: number;
  showLegend?: boolean;
}

export const PieChartWidget: React.FC<PieChartWidgetProps> = ({
  data,
  size = 170,
  showLegend = true,
}) => {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + Math.max(0, item.value || 0), 0);

  const radius = size / 2 - 4;
  const center = size / 2;

  let cumulativeAngle = -Math.PI / 2;

  const segments = data.map((item, index) => {
    const itemValue = Math.max(0, item.value || 0);
    const percentage = total > 0 ? itemValue / total : 0;
    const angle = percentage * 2 * Math.PI;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    // Full pie slice path with slight gap (stroke)
    const pathData = total > 0 && percentage > 0.999
      ? `M ${center} ${center} m -${radius} 0 a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 -${radius * 2} 0 Z`
      : `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    const formattedPct = (percentage * 100).toFixed(percentage < 0.1 && percentage > 0 ? 1 : 0) + '%';

    return {
      ...item,
      percentage: Math.round(percentage * 100),
      formattedPct,
      pathData,
      index,
    };
  });

  return (
    <div className="flex items-center justify-between gap-4 w-full">
      {/* Side Legend */}
      {showLegend && (
        <div className="flex-1 space-y-1.5 min-w-0 pr-1 text-right select-none" dir="rtl">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className={`flex items-center justify-between text-xs py-1 px-2 rounded-md transition-colors cursor-pointer ${
                activeSegmentIndex === seg.index ? 'bg-black/5 dark:bg-white/10 font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              onMouseEnter={() => setActiveSegmentIndex(seg.index)}
              onMouseLeave={() => setActiveSegmentIndex(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-xs flex-shrink-0 shadow-2xs"
                  style={{ backgroundColor: seg.color }}
                />
                <span
                  className="font-bold truncate text-xs"
                  style={{ color: 'var(--token-report-card-text, var(--token-text-primary))' }}
                >
                  {seg.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ms-2 text-[11px] flex-shrink-0">
                {seg.formattedValue && (
                  <span
                    className="font-extrabold dir-ltr text-xs tabular-nums"
                    style={{ color: 'var(--token-report-card-title, var(--token-text-primary))' }}
                  >
                    {seg.formattedValue}
                  </span>
                )}
                <span
                  className="font-semibold tabular-nums text-[11px]"
                  style={{ color: 'var(--token-report-card-subtext, var(--token-text-secondary))' }}
                >
                  ({seg.formattedPct})
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Pie Chart with Slight Gap Between Slices */}
      <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
          {total === 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="var(--token-report-card-input-bg, #f1f5f9)"
              className="opacity-60"
            />
          ) : (
            segments.map((seg) => (
              <path
                key={seg.id}
                d={seg.pathData}
                style={{
                  fill: seg.color,
                  stroke: 'var(--token-report-card-bg, #ffffff)',
                  strokeWidth: 2.5,
                  strokeLinejoin: 'round',
                  transform: activeSegmentIndex === seg.index ? 'scale(1.04)' : 'scale(1)',
                  transformOrigin: `${center}px ${center}px`,
                  transition: 'transform 200ms, opacity 200ms',
                }}
                className="cursor-pointer hover:opacity-90"
                onMouseEnter={() => setActiveSegmentIndex(seg.index)}
                onMouseLeave={() => setActiveSegmentIndex(null)}
              />
            ))
          )}
        </svg>
      </div>
    </div>
  );
};

export default PieChartWidget;
