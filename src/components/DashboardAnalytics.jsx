import { useRef, useState } from 'react'
import { IconArrowRight } from './icons'

const CHART_WIDTH = 350
const CHART_HEIGHT = 140

function recentActivity(records) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const key = date.toLocaleDateString()
    const count = records.filter((record) => {
      const created = new Date(record.createdAt)
      return !Number.isNaN(created.getTime()) && created.toLocaleDateString() === key
    }).length

    return {
      date,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      count,
    }
  })
}

function StatusBars({ metrics, selectedKey, onSelect }) {
  const max = Math.max(1, ...metrics.map((metric) => metric.value))

  return (
    <div className="analytics-bar-chart" role="group" aria-label="Complaint counts by status">
      <div className="analytics-bar-guides" aria-hidden="true"><i /><i /><i /></div>
      {metrics.map((metric) => (
        <button
          type="button"
          className={`analytics-bar-column analytics-tone-${metric.tone}${selectedKey === metric.key ? ' is-selected' : ''}`}
          key={metric.key}
          onClick={() => onSelect(metric)}
          aria-pressed={selectedKey === metric.key}
          title={`${metric.label}: ${metric.value}. Select to filter.`}
        >
          <strong>{metric.value}</strong>
          <span className="analytics-bar-track"><i style={{ height: `${metric.value ? Math.max(6, (metric.value / max) * 100) : 0}%` }} /></span>
          <span className="analytics-bar-label">{metric.shortLabel || metric.label}</span>
        </button>
      ))}
    </div>
  )
}

function StatusDistribution({ metrics, totalCount, selectedKey, onSelect }) {
  const distributionTotal = metrics.reduce((sum, metric) => sum + metric.value, 0)
  let offset = 0
  const segments = metrics.map((metric) => {
    const start = offset
    offset += distributionTotal ? (metric.value / distributionTotal) * 100 : 0
    return metric.value ? `var(--analytics-color-${metric.tone}) ${start}% ${offset}%` : null
  }).filter(Boolean)

  return (
    <div className="analytics-distribution">
      <div
        className={`analytics-donut${distributionTotal ? '' : ' is-empty'}`}
        style={{ background: distributionTotal ? `conic-gradient(${segments.join(', ')})` : undefined }}
        role="img"
        aria-label={`Distribution of ${distributionTotal} categorized items`}
      >
        <div><strong>{totalCount}</strong><span>Total</span></div>
      </div>
      <div className="analytics-legend">
        {metrics.map((metric) => (
          <button
            type="button"
            className={`analytics-legend-item analytics-tone-${metric.tone}${selectedKey === metric.key ? ' is-selected' : ''}`}
            key={metric.key}
            onClick={() => onSelect(metric)}
            aria-pressed={selectedKey === metric.key}
            title={`${metric.label}: ${metric.value}. Select to filter.`}
          >
            <i />
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </button>
        ))}
      </div>
    </div>
  )
}

function ActivityTrend({ records }) {
  const [selectedDay, setSelectedDay] = useState(null)
  const days = recentActivity(records)
  const max = Math.max(1, ...days.map((day) => day.count))
  const points = days.map((day, index) => ({
    ...day,
    x: 24 + index * 50.3,
    y: 104 - (day.count / max) * 76,
  }))
  const path = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <div className="analytics-trend-wrap">
      <svg className="analytics-trend-svg" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label="Complaint activity over the last seven days">
        <path className="analytics-trend-area" d={`M ${points[0].x},112 L ${path} L ${points[points.length - 1].x},112 Z`} />
        <polyline className="analytics-trend-line" points={path} />
        {points.map((point, index) => <g key={point.label + point.date.toISOString()}><circle className={`analytics-trend-point${selectedDay === index ? ' is-selected' : ''}`} cx={point.x} cy={point.y} r="4" /><text className="analytics-trend-label" x={point.x} y="132" textAnchor="middle">{point.label}</text></g>)}
      </svg>
      <div className="analytics-trend-hit-areas">
        {points.map((point, index) => (
          <button
            type="button"
            key={point.label + point.date.toISOString()}
            className={`analytics-trend-hit${selectedDay === index ? ' is-selected' : ''}`}
            style={{ left: `${(point.x / CHART_WIDTH) * 100}%`, top: `${(point.y / CHART_HEIGHT) * 100}%` }}
            onClick={() => setSelectedDay((current) => current === index ? null : index)}
            aria-pressed={selectedDay === index}
            aria-label={`${point.date.toLocaleDateString()}: ${point.count} complaint${point.count === 1 ? '' : 's'}`}
            title={`${point.date.toLocaleDateString()}: ${point.count} complaint${point.count === 1 ? '' : 's'}`}
          />
        ))}
      </div>
      <p className="analytics-trend-summary" aria-live="polite">
        {selectedDay === null
          ? 'Daily complaints created over the last 7 days'
          : `${points[selectedDay].date.toLocaleDateString()}: ${points[selectedDay].count} complaint${points[selectedDay].count === 1 ? '' : 's'}`}
      </p>
    </div>
  )
}

export default function DashboardAnalytics({ metrics, distributionMetrics = metrics, totalCount, records, selectedKey, onMetricSelect }) {
  const railRef = useRef(null)

  const scrollRail = (direction) => {
    if (!railRef.current) return
    railRef.current.scrollBy({ left: direction * 340, behavior: 'smooth' })
  }

  return (
    <section className="dashboard-analytics" aria-label="Dashboard analytics">
      <div className="analytics-heading">
        <div><span className="dashboard-eyebrow">AT A GLANCE</span><h2>Service analytics <span className="analytics-sparkle" aria-hidden="true">✦</span></h2></div>
        <div className="analytics-scroll-controls">
          <button type="button" onClick={() => scrollRail(-1)} aria-label="Scroll charts left"><span>‹</span></button>
          <button type="button" onClick={() => scrollRail(1)} aria-label="Scroll charts right"><IconArrowRight size={16} /></button>
        </div>
      </div>
      <div className="analytics-rail" ref={railRef} tabIndex={0} aria-label="Scrollable service charts">
        <article className="analytics-card analytics-bars-card">
          <div className="analytics-card-heading"><div><h3>Status volume</h3><p>Choose a bar to filter; select again to clear</p></div><span className="analytics-card-total">{totalCount}<small>items</small></span></div>
          <StatusBars metrics={metrics} selectedKey={selectedKey} onSelect={onMetricSelect} />
        </article>
        <article className="analytics-card analytics-donut-card">
          <div className="analytics-card-heading"><div><h3>Status distribution</h3><p>Select a status to filter</p></div></div>
          <StatusDistribution metrics={distributionMetrics} totalCount={totalCount} selectedKey={selectedKey} onSelect={onMetricSelect} />
        </article>
        <article className="analytics-card analytics-trend-card">
          <div className="analytics-card-heading"><div><h3>Recent activity</h3><p>Complaint intake in the last 7 days</p></div></div>
          <ActivityTrend records={records} />
        </article>
      </div>
    </section>
  )
}
