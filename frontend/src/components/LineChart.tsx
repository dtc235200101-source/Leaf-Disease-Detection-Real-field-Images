export interface LineSeries {
  key: string;
  label: string;
  color: string;
  values: number[];
}

interface LineChartProps {
  series: LineSeries[];
  labels: string[];
  height?: number;
  valueFormat?: (value: number) => string;
}

export function LineChart({ series, labels, height = 240, valueFormat }: LineChartProps) {
  const width = 480;
  const padding = { top: 18, right: 14, bottom: 34, left: 46 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = labels.length;
  const allValues = series.flatMap((item) => item.values);
  const maxValue = Math.max(0.1, Math.ceil(Math.max(...allValues, 0.1) * 10) / 10);
  const format = valueFormat ?? ((value: number) => value.toFixed(2));

  const x = (index: number) =>
    padding.left + (points <= 1 ? plotWidth / 2 : (index / (points - 1)) * plotWidth);
  const y = (value: number) => padding.top + plotHeight - (value / maxValue) * plotHeight;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ratio * maxValue);

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Đường huấn luyện theo epoch">
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="rgba(6, 95, 70, 0.1)"
              strokeDasharray="4 4"
            />
            <text x={padding.left - 8} y={y(tick) + 4} textAnchor="end" className="line-chart-tick">
              {tick.toFixed(2)}
            </text>
          </g>
        ))}

        {labels.map((label, index) => (
          <text
            key={label}
            x={x(index)}
            y={height - 8}
            textAnchor="middle"
            className="line-chart-tick"
          >
            {label}
          </text>
        ))}

        {series.map((item) => {
          const path = item.values
            .map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`)
            .join(" ");
          return (
            <g key={item.key}>
              <path d={path} fill="none" stroke={item.color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
              {item.values.map((value, index) => (
                <circle key={`${item.key}-${index}`} cx={x(index)} cy={y(value)} r={3} fill="#ffffff" stroke={item.color} strokeWidth={2}>
                  <title>{`${item.label} · epoch ${labels[index]}: ${format(value)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      <ul className="chart-legend">
        {series.map((item) => (
          <li key={item.key}>
            <i style={{ backgroundColor: item.color }} aria-hidden="true" />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
