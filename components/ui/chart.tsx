"use client"

import type * as React from "react"

// Simple chart components for dashboard visualization
interface ChartData {
  name: string
  value: number
  color?: string
}

interface LineChartProps {
  data: ChartData[]
  height?: number
  className?: string
}

export function LineChart({ data, height = 200, className = "" }: LineChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value))
  const minValue = Math.min(...data.map((d) => d.value))
  const range = maxValue - minValue || 1

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <svg width="100%" height="100%" className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <line key={i} x1="0" y1={height * ratio} x2="100%" y2={height * ratio} stroke="#e5e7eb" strokeWidth="1" />
        ))}

        {/* Data line */}
        <polyline
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          points={data
            .map((d, i) => {
              const x = (i / (data.length - 1)) * 100
              const y = height - ((d.value - minValue) / range) * height
              return `${x}%,${y}`
            })
            .join(" ")}
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * 100
          const y = height - ((d.value - minValue) / range) * height
          return <circle key={i} cx={`${x}%`} cy={y} r="4" fill="#3b82f6" className="hover:r-6 transition-all" />
        })}
      </svg>

      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
        {data.map((d, i) => (
          <span key={i}>{d.name}</span>
        ))}
      </div>
    </div>
  )
}

interface BarChartProps {
  data: ChartData[]
  height?: number
  className?: string
}

export function BarChart({ data, height = 200, className = "" }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value))

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <div className="flex items-end justify-between h-full gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div
              className={`w-full rounded-t transition-all hover:opacity-80 ${d.color || "bg-blue-500"}`}
              style={{
                height: `${(d.value / maxValue) * 80}%`,
                minHeight: "4px",
              }}
              title={`${d.name}: ${d.value}`}
            />
            <span className="text-xs text-muted-foreground mt-2 text-center">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface PieChartProps {
  data: ChartData[]
  size?: number
  className?: string
}

export function PieChart({ data, size = 200, className = "" }: PieChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  let currentAngle = 0

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"]

  return (
    <div className={`relative ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        {data.map((d, i) => {
          const percentage = d.value / total
          const angle = percentage * 360
          const radius = size / 2 - 10
          const centerX = size / 2
          const centerY = size / 2

          const startAngle = (currentAngle * Math.PI) / 180
          const endAngle = ((currentAngle + angle) * Math.PI) / 180

          const x1 = centerX + radius * Math.cos(startAngle)
          const y1 = centerY + radius * Math.sin(startAngle)
          const x2 = centerX + radius * Math.cos(endAngle)
          const y2 = centerY + radius * Math.sin(endAngle)

          const largeArcFlag = angle > 180 ? 1 : 0

          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            "Z",
          ].join(" ")

          currentAngle += angle

          return (
            <path
              key={i}
              d={pathData}
              fill={d.color || colors[i % colors.length]}
              className="hover:opacity-80 transition-opacity"
              data-title={`${d.name}: ${d.value} (${(percentage * 100).toFixed(1)}%)`}
            />
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: d.color || colors[i % colors.length] }} />
            <span>
              {d.name}: {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ChartContainerProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
}

export function ChartContainer({ children, title, description, className = "" }: ChartContainerProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div>
          {title && <h3 className="text-lg font-semibold">{title}</h3>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      {children}
    </div>
  )
}

interface ChartTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
}

export function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3">
      <p className="font-medium">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}
