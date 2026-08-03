import React, { useState } from 'react';

export interface PieSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  formattedValue?: string;
}

interface DonutChartWidgetProps {
  data: PieSegment[];
  centerLabel?: string;
  centerValue?: string;
  size?: number;
  donutWidth?: number;
  showLegend?: boolean;
}

export const DonutChartWidget: React.FC<DonutChartWidgetProps> = ({
  data,
  centerLabel,
  centerValue,
  size = 160,
  donutWidth = 26,
  showLegend = true
}) => {
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  const radius = size / 2;
  const outerRadius = radius - 4;
  const innerRadius = outerRadius - donutWidth;
  const center = radius;

  let cumulativeAngle = -Math.PI / 2;

  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) : 0;
    const angle = percentage * 2 * Math.PI;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const x1Outer = center + outerRadius * Math.cos(startAngle);
    const y1Outer = center + outerRadius * Math.sin(startAngle);
    const x2Outer = center + outerRadius * Math.cos(endAngle);
    const y2Outer = center + outerRadius * Math.sin(endAngle);

    const x1Inner = center + innerRadius * Math.cos(endAngle);
    const y1Inner = center + innerRadius * Math.sin(endAngle);
    const x2Inner = center + innerRadius * Math.cos(startAngle);
    const y2Inner = center + innerRadius * Math.sin(startAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const pathData = total > 0 && percentage > 0.999
      ? `M ${center - outerRadius}, ${center}
         A ${outerRadius},${outerRadius} 0 1,0 ${center + outerRadius},${center}
         A ${outerRadius},${outerRadius} 0 1,0 ${center - outerRadius},${center}
         M ${center - innerRadius}, ${center}
         A ${innerRadius},${innerRadius} 0 1,1 ${center + innerRadius},${center}
         A ${innerRadius},${innerRadius} 0 1,1 ${center - innerRadius},${center} Z`
      : `M ${x1Outer} ${y1Outer}
         A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}
         L ${x1Inner} ${y1Inner}
         A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner}
         Z`;

    return {
      ...item,
      percentage: Math.round(percentage * 100),
      pathData,
      index
    };
  });

  const activeSegment = activeSegmentIndex !== null ? segments[activeSegmentIndex] : null;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible transform transition-all duration-200">
          {total === 0 ? (
            <circle
              cx={center}
              cy={center}
              r={(outerRadius + innerRadius) / 2}
              fill="none"
              stroke="var(--border-default, #e5e7eb)"
              strokeWidth={donutWidth}
              className="opacity-40"
            />
          ) : (
            segments.map((seg) => (
              <path
                key={seg.id}
                d={seg.pathData}
                fill={seg.color}
                className="transition-all duration-200 cursor-pointer hover:opacity-85"
                style={{
                  transform: activeSegmentIndex === seg.index ? 'scale(1.04)' : 'scale(1)',
                  transformOrigin: `${center}px ${center}px`,
                }}
                onMouseEnter={() => setActiveSegmentIndex(seg.index)}
                onMouseLeave={() => setActiveSegmentIndex(null)}
              />
            ))
          )}
        </svg>

        {/* Center Label & Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
          {activeSegment ? (
            <>
              <span className="text-[11px] font-semibold text-text-secondary line-clamp-1">
                {activeSegment.label}
              </span>
              <span className="text-sm font-bold text-text-primary mt-0.5">
                {activeSegment.formattedValue || activeSegment.value}
              </span>
              <span className="text-[10px] font-bold text-primary">
                ({activeSegment.percentage}%)
              </span>
            </>
          ) : (
            <>
              {centerLabel && (
                <span className="text-[11px] font-semibold text-text-secondary line-clamp-1">
                  {centerLabel}
                </span>
              )}
              {centerValue && (
                <span className="text-sm font-bold text-text-primary mt-0.5">
                  {centerValue}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="w-full mt-3 space-y-1.5 px-1">
          {segments.map((seg) => (
            <div
              key={seg.id}
              className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg transition-colors cursor-pointer ${
                activeSegmentIndex === seg.index ? 'bg-muted/60 font-bold' : 'hover:bg-muted/30'
              }`}
              onMouseEnter={() => setActiveSegmentIndex(seg.index)}
              onMouseLeave={() => setActiveSegmentIndex(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-text-primary truncate">{seg.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                <span className="font-bold text-text-primary">
                  {seg.formattedValue || seg.value}
                </span>
                <span className="text-[10px] text-text-secondary">
                  ({seg.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DonutChartWidget;
