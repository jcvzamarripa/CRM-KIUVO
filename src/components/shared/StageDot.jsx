import { STAGE_BY_ID } from '../../constants/stages'

export default function StageDot({ stage, size = 8 }) {
  const s = STAGE_BY_ID[stage]
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      background: s?.color || '#888',
      display: 'inline-block', flexShrink: 0,
    }} />
  )
}
