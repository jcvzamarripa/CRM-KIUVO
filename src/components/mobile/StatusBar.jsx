import Icon from '../shared/Icon'

export default function StatusBar() {
  const now = new Date()
  const hours = now.getHours()
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const time = `${hours}:${minutes}`

  return (
    <div style={{
      height: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      padding: '0 24px 6px', position: 'relative', zIndex: 5,
      background: 'var(--bg)',
    }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>{time}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg)' }}>
        <Icon name="signal-4g" size={14} />
        <Icon name="wifi" size={14} />
        <Icon name="battery-3" size={16} />
      </div>
    </div>
  )
}
