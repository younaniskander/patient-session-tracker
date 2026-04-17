import { cn } from "@/lib/utils";

interface CircularGaugeProps {
  /** Current value 0-100 */
  value: number;
  /** Threshold 0-100, shows tick marker */
  threshold?: number | null;
  /** Whether the threshold has been reached */
  reached?: boolean;
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  /** Tailwind color class for the arc, e.g. "text-primary" */
  colorClass?: string;
}

export function CircularGauge({
  value,
  threshold,
  reached = false,
  label,
  sublabel,
  size = 200,
  strokeWidth = 14,
  colorClass = "text-primary",
}: CircularGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // We render a 270° arc (from 135° to 45° going clockwise)
  const arcFraction = 0.75;
  const arcLength = circumference * arcFraction;
  const dashOffset = arcLength - (clamped / 100) * arcLength;

  // threshold marker angle on the same 270° arc, starting at 135°
  const thresholdAngle =
    threshold != null ? 135 + (Math.max(0, Math.min(100, threshold)) / 100) * 270 : null;
  const cx = size / 2;
  const cy = size / 2;
  const tickInner = radius - strokeWidth / 2 - 2;
  const tickOuter = radius + strokeWidth / 2 + 2;
  let tickX1 = 0,
    tickY1 = 0,
    tickX2 = 0,
    tickY2 = 0,
    labelX = 0,
    labelY = 0;
  if (thresholdAngle != null) {
    const rad = (thresholdAngle * Math.PI) / 180;
    tickX1 = cx + tickInner * Math.cos(rad);
    tickY1 = cy + tickInner * Math.sin(rad);
    tickX2 = cx + tickOuter * Math.cos(rad);
    tickY2 = cy + tickOuter * Math.sin(rad);
    labelX = cx + (tickOuter + 10) * Math.cos(rad);
    labelY = cy + (tickOuter + 10) * Math.sin(rad);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-[225deg]">
          {/* Background track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
          />
          {/* Active arc */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={dashOffset}
            className={cn(
              "transition-all duration-150 ease-out",
              reached ? "text-success" : colorClass
            )}
          />
        </svg>

        {/* Threshold tick marker (rendered in normal coordinate space) */}
        {thresholdAngle != null && (
          <svg
            width={size}
            height={size}
            className="absolute inset-0 pointer-events-none"
          >
            <line
              x1={tickX1}
              y1={tickY1}
              x2={tickX2}
              y2={tickY2}
              stroke="hsl(var(--foreground))"
              strokeWidth={3}
              strokeLinecap="round"
              opacity={0.85}
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px] font-medium"
            >
              {threshold}%
            </text>
          </svg>
        )}

        {/* Center value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={cn(
              "text-5xl font-bold font-mono tabular-nums transition-colors",
              reached ? "text-success" : "text-foreground"
            )}
          >
            {Math.round(clamped)}
            <span className="text-2xl text-muted-foreground ml-0.5">%</span>
          </div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
            {label}
          </div>
          {sublabel && (
            <div className="text-[10px] text-muted-foreground/70 mt-0.5">{sublabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}
