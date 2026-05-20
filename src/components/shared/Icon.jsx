export default function Icon({ name, size = 18, color, style }) {
  return (
    <i
      className={`ti ti-${name}`}
      style={{ fontSize: size, color, lineHeight: 1, display: 'inline-block', verticalAlign: 'middle', ...style }}
    />
  )
}
