"use client"

import React, { useState, useRef } from "react"

interface ControlKnobProps {
  value: number
  onChange: (val: number) => void
  label?: string
  color?: string
  size?: number
  formatValue?: (val: number) => string
}

export function ControlKnob({
  value,
  onChange,
  label,
  color = "#3b82f6",
  size = 50,
  formatValue,
}: ControlKnobProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startYRef = useRef<number>(0)
  const startValueRef = useRef<number>(0)

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    startYRef.current = e.clientY
    startValueRef.current = value
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    e.preventDefault()
    const deltaY = startYRef.current - e.clientY
    const change = deltaY / 150
    let newValue = startValueRef.current + change
    newValue = Math.max(0, Math.min(1, newValue))
    onChange(newValue)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false)
    ;(e.target as Element).releasePointerCapture(e.pointerId)
  }

  const ticks = []
  const numTicks = 20
  const startAngle = 135
  const endAngle = 405

  for (let i = 0; i < numTicks; i++) {
    const pct = i / (numTicks - 1)
    const angle = startAngle + (endAngle - startAngle) * pct
    const rad = (angle * Math.PI) / 180
    const isLit = value >= pct

    const innerR = 34
    const outerR = 44
    const x1 = 50 + innerR * Math.cos(rad)
    const y1 = 50 + innerR * Math.sin(rad)
    const x2 = 50 + outerR * Math.cos(rad)
    const y2 = 50 + outerR * Math.sin(rad)

    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={isLit ? color : "#1a1a24"}
        strokeWidth={isLit ? 2 : 1.5}
        strokeLinecap="round"
        style={{ opacity: isLit ? 1 : 0.3 }}
      />
    )
  }

  const knobAngle = startAngle + (endAngle - startAngle) * value

  return (
    <div
      className="relative flex flex-col items-center justify-center cursor-ns-resize group select-none touch-none"
      style={{ width: size, height: size }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      title={label}
    >
      <svg
        width="140%"
        height="140%"
        viewBox="0 0 100 100"
        className="pointer-events-none z-0 absolute top-[-20%] left-[-20%]"
      >
        {ticks}
      </svg>

      {/* Central Knob Body */}
      <div
        className="relative z-10 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.5)] bg-gradient-to-b from-[#1a1a24] to-[#0a0a0f] border border-border flex items-center justify-center overflow-hidden"
        style={{ width: size * 0.75, height: size * 0.75 }}
      >
        {/* Indicator Dot */}
        <div
          className="absolute w-full h-full pointer-events-none"
          style={{ transform: `rotate(${knobAngle}deg)` }}
        >
          <div
            className="absolute w-1.5 h-1.5 rounded-full top-[10%] left-1/2 -translate-x-1/2"
            style={{
              backgroundColor: value > 0 ? color : "#27272a",
              boxShadow: value > 0 ? `0 0 5px ${color}` : "none",
            }}
          />
        </div>

        {/* Value Readout */}
        <span className="text-[9px] font-mono font-bold text-foreground/80 select-none z-20 tabular-nums tracking-tighter">
          {formatValue
            ? formatValue(value).replace(/x|%/, "")
            : Math.round(value * 100)}
          <span className="text-[7px] opacity-50 ml-[1px]">
            {formatValue?.(value).includes("x") ? "x" : "%"}
          </span>
        </span>
      </div>

      {label && (
        <div className="absolute -bottom-4 font-mono font-bold text-[9px] text-muted-foreground group-hover:text-foreground uppercase tracking-wider pointer-events-none whitespace-nowrap transition-colors">
          {label}
        </div>
      )}
    </div>
  )
}
