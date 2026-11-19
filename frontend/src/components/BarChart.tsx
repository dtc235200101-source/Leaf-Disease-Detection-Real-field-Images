export interface BarRow {
  key: string;
  label: string;
  value: number;
  color?: string;
  hint?: string;
  display?: string;
}

interface BarChartProps {
  rows: BarRow[];
  unit?: string;
  emptyMessage?: string;
}

export function BarChart({ rows, unit = "", emptyMessage = "Không có dữ liệu." }: BarChartProps) {
  if (rows.length === 0) {
    return <p className="chart-empty">{emptyMessage}</p>;
  }
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <ul className="bar-chart">
      {rows.map((row) => {
        const ratio = row.value / max;
        const width = row.value === 0 ? 0 : Math.max(ratio * 100, 1.5);
        return (
          <li key={row.key} className="bar-row">
            <span className="bar-label" style={row.color ? { borderColor: row.color } : undefined}>
              {row.color && (
                <i className="bar-swatch" style={{ backgroundColor: row.color }} aria-hidden="true" />
              )}
              {row.label}
            </span>
            <span className="bar-track" aria-hidden="true">
              <span
                className="bar-fill"
                style={{
                  width: `${width}%`,
                  background: row.color
                    ? `linear-gradient(90deg, ${row.color}33, ${row.color})`
                    : undefined,
                }}
              />
            </span>
            <span className="bar-value">
              {row.display ?? `${row.value}${unit}`}
              {row.hint && <small>{row.hint}</small>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
