import type { ReactNode } from "react"

const px = (grid: number[][], colors: Record<number, string>) => {
  const rects: ReactNode[] = []
  grid.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell === 0) return
      const color = colors[cell]
      rects.push(
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
      )
    })
  })
  return rects
}

export function PixelFlag({ size = 32 }: { size?: number }) {
  const grid: number[][] = []
  for (let y = 0; y < 10; y++) {
    const row: number[] = []
    for (let x = 0; x < 10; x++) {
      row.push((x + y) % 2 === 0 ? 1 : 2)
    }
    grid.push(row)
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      shapeRendering="crispEdges"
    >
      {px(grid, { 1: "#f2f2f2", 2: "#0a0a0a" })}
    </svg>
  )
}

export function Helmet({ color, size = 40 }: { color: string; size?: number }) {
  const grid = [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 2, 2, 2, 2, 1, 1],
    [1, 1, 2, 3, 3, 2, 1, 1],
    [1, 1, 2, 2, 2, 2, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 0, 0],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 8 8" shapeRendering="crispEdges">
      {px(grid, { 1: color, 2: "#0a0a0a", 3: "#39ff88" })}
    </svg>
  )
}

export function PixelCar({ color, size = 64 }: { color: string; size?: number }) {
  const grid = [
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
    [2, 2, 1, 1, 3, 1, 1, 1, 1, 3, 1, 1, 1, 1, 2, 2],
    [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0],
    [0, 4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 4, 0],
  ]
  return (
    <svg
      width={size}
      height={(size * 7) / 16}
      viewBox="0 0 16 7"
      shapeRendering="crispEdges"
    >
      {px(grid, { 1: color, 2: "#111", 3: "#3ad1ff", 4: "#0a0a0a" })}
    </svg>
  )
}

const COMPOUND_COLOR: Record<string, string> = {
  SOFT: "#ff3333",
  MEDIUM: "#ffd400",
  HARD: "#f2f2f2",
}
const COMPOUND_LETTER: Record<string, string> = {
  SOFT: "S",
  MEDIUM: "M",
  HARD: "H",
}

export function TireBadge({ compound, size = 28 }: { compound: string; size?: number }) {
  const color = COMPOUND_COLOR[compound] ?? "#888"
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" shapeRendering="crispEdges">
      <circle cx={5} cy={5} r={4.5} fill="#0a0a0a" stroke={color} strokeWidth={1.4} />
      <circle cx={5} cy={5} r={2.2} fill={color} />
      <text
        x={5}
        y={6.2}
        fontSize={2.6}
        textAnchor="middle"
        fill="#0a0a0a"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {COMPOUND_LETTER[compound] ?? "?"}
      </text>
    </svg>
  )
}

export function CheckeredStrip({ height = 6 }: { height?: number }) {
  return (
    <svg
      width="100%"
      height={height}
      viewBox="0 0 32 2"
      preserveAspectRatio="none"
      shapeRendering="crispEdges"
    >
      {Array.from({ length: 32 }).map((_, x) => (
        <rect
          key={x}
          x={x}
          y={x % 2 === 0 ? 0 : 1}
          width={1}
          height={1}
          fill={x % 2 === 0 ? "#fff" : "#000"}
        />
      ))}
    </svg>
  )
}
