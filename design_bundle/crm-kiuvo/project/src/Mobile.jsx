// KIUVO CRM — Mobile (vendedor) screens
// Exports: MobileApp (wrapper), Dashboard, Kanban, BottomNav

// ─── helpers ──────────────────────────────────────────────────
const fmt = n => '$' + n.toLocaleString('es-MX');
const Icon = ({ name, size, color, style }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, color, ...style }} />
);
const StageDot = ({ stage, size = 8 }) => (
  <span style={{ width: size, height: size, borderRadius: '50%', background: STAGE_BY_ID[stage].color, display: 'inline-block', flexShrink: 0 }} />
);

// ─── BottomNav ────────────────────────────────────────────────
function BottomNav({ active, onChange }) {
  const items = [
    { id: 'inicio', label: 'Inicio',  icon: 'home' },
    { id: 'embudo', label: 'Embudo',  icon: 'layout-kanban' },
    { id: 'mapa',   label: 'Mapa',    icon: 'map-2' },
    { id: 'agenda', label: 'Agenda',  icon: 'calendar' },
    { id: 'mas',    label: 'Más',     icon: 'menu-2' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingBottom: 24, paddingTop: 8,
      background: 'var(--bg)', borderTop: '0.5px solid var(--border)',
      display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
    }}>
      {items.map(it => {
        const on = active === it.id;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '6px 0', color: on ? 'var(--kiuvo-blue)' : 'var(--fg-tertiary)',
          }}>
            <Icon name={it.icon} size={22} />
            <span style={{ fontSize: 10, fontWeight: on ? 500 : 400 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────
function Header() {
  return (
    <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--kiuvo-blue-soft)', color: 'var(--kiuvo-blue-deep)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 500, letterSpacing: 0.5,
        }}>LR</div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>Buen día,</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Luis Ramírez</div>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <button style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '0.5px solid var(--border)', background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--fg)',
        }}>
          <Icon name="bell" size={18} />
        </button>
        <span style={{
          position: 'absolute', top: -2, right: -2,
          minWidth: 18, height: 18, padding: '0 4px',
          borderRadius: 9, background: '#E24B4A', color: '#fff',
          fontSize: 10, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1.5px solid var(--bg)',
        }}>3</span>
      </div>
    </div>
  );
}

// ─── Meta card ────────────────────────────────────────────────
function MetaCard({ state }) {
  // state: 'on' | 'mid' | 'red'
  const goals = {
    on:  { current: 92400, pct: 0.92, racha: 8, nivel: 5, tone: 'good' },
    mid: { current: 68400, pct: 0.68, racha: 5, nivel: 4, tone: 'mid'  },
    red: { current: 28100, pct: 0.28, racha: 1, nivel: 2, tone: 'bad'  },
  };
  const g = goals[state] || goals.mid;
  const goal = 100000;
  const daysLeft = 3;

  const tones = {
    good: { bg: 'var(--success-bg)', fg: 'var(--success-fg)', deep: '#0A4A3B', mid: '#B8E3D2', fill: 'var(--success)', deepText: 'var(--success-fg)' },
    mid:  { bg: 'var(--kiuvo-blue-soft)', fg: 'var(--kiuvo-blue)', deep: 'var(--kiuvo-blue-deep)', mid: 'var(--kiuvo-blue-mid)', fill: 'var(--kiuvo-blue)', deepText: 'var(--kiuvo-blue-deep)' },
    bad:  { bg: '#FCEBEB', fg: '#A32D2D', deep: '#501313', mid: '#F0B6B6', fill: '#A32D2D', deepText: '#501313' },
  };
  const t = tones[g.tone];

  return (
    <div style={{
      margin: '0 16px', padding: '14px 16px',
      background: t.bg, borderRadius: 'var(--r-lg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, color: t.fg, letterSpacing: 0.4 }}>META SEMANAL</div>
          <div style={{ marginTop: 2, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 500, color: t.deepText, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4 }}>{fmt(g.current)}</span>
            <span style={{ fontSize: 12, color: t.fg }}>de {fmt(goal)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 9px', borderRadius: 'var(--r-full)',
            background: t.mid, color: t.deepText,
            fontSize: 11, fontWeight: 500,
          }}>
            <Icon name="flame" size={12} />
            <span>Nivel {g.nivel}</span>
          </div>
          <div style={{ fontSize: 11, color: t.fg, marginTop: 4 }}>Racha: {g.racha} días</div>
        </div>
      </div>
      {/* progress */}
      <div style={{ marginTop: 10, height: 8, borderRadius: 4, background: t.mid, overflow: 'hidden' }}>
        <div style={{ width: `${g.pct * 100}%`, height: '100%', background: t.fill, borderRadius: 4 }} />
      </div>
      <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.fg }}>
        <span style={{ fontWeight: 500 }}>{Math.round(g.pct * 100)}%</span>
        <span>{daysLeft} días restantes</span>
      </div>
    </div>
  );
}

// ─── DayStats ─────────────────────────────────────────────────
function DayStats() {
  const items = [
    { v: '5', l: 'Visitas hoy' },
    { v: '2', l: 'Cotizaciones' },
    { v: '1', l: 'Cierres' },
  ];
  return (
    <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {items.map(it => (
        <div key={it.l} style={{
          background: 'var(--bg-secondary)', borderRadius: 'var(--r-md)',
          padding: '12px 10px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 22, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.4 }}>{it.v}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>{it.l}</div>
        </div>
      ))}
    </div>
  );
}

// ─── FollowupAlert (banner or hero) ───────────────────────────
function FollowupAlert({ hero = false, onOpen }) {
  if (hero) {
    return (
      <div style={{ margin: '0 16px', padding: '16px', background: 'var(--warning-bg)', border: '0.5px solid var(--warning-border)', borderRadius: 'var(--r-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{
            width: 36, height: 36, flexShrink: 0, borderRadius: 'var(--r-md)',
            background: '#FAC775', color: 'var(--warning-fg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name="eye-exclamation" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--warning-fg)' }}>Seguimiento pendiente</div>
            <div style={{ fontSize: 12, color: 'var(--warning-fg)', opacity: 0.85, marginTop: 2 }}>
              2 prospectos en riesgo · 1 estancado
            </div>
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <button onClick={onOpen} style={{
                padding: '7px 12px', borderRadius: 'var(--r-md)',
                background: 'var(--warning-fg)', color: '#FFF8EB',
                fontSize: 12, fontWeight: 500,
              }}>Ver lista</button>
              <button style={{
                padding: '7px 12px', borderRadius: 'var(--r-md)',
                border: '0.5px solid var(--warning-border)', color: 'var(--warning-fg)',
                fontSize: 12, fontWeight: 500,
              }}>Recordar mañana</button>
            </div>
          </div>
        </div>
        {/* mini list of at-risk prospects */}
        <div style={{ marginTop: 14, borderTop: '0.5px solid var(--warning-border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { name: 'Refaccionaria El Bajío', why: '24 días en Presentación', stage: 'presentacion', kind: 'red' },
            { name: 'Materiales Pacífico',    why: '11 días sin visita',      stage: 'cotizacion',  kind: 'amber' },
            { name: 'Plomería Industrial Vega', why: 'Sin visitas registradas', stage: 'prospeccion', kind: 'amber' },
          ].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: p.kind === 'red' ? 'var(--danger)' : 'var(--warning)',
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--warning-fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--warning-fg)', opacity: 0.8 }}>{p.why}</div>
              </div>
              <StageDot stage={p.stage} />
              <Icon name="chevron-right" size={14} color="var(--warning-fg)" style={{ opacity: 0.5 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button onClick={onOpen} style={{
      width: 'calc(100% - 32px)', margin: '0 16px',
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--warning-bg)', border: '0.5px solid var(--warning-border)',
      borderRadius: 'var(--r-lg)', textAlign: 'left',
    }}>
      <Icon name="eye-exclamation" size={20} color="var(--warning-fg)" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--warning-fg)' }}>Seguimiento pendiente</div>
        <div style={{ fontSize: 11, color: 'var(--warning-fg)', opacity: 0.85 }}>2 prospectos en riesgo · 1 estancado</div>
      </div>
      <Icon name="chevron-right" size={18} color="var(--warning-fg)" />
    </button>
  );
}

// ─── Quick actions grid ───────────────────────────────────────
function QuickActions() {
  const items = [
    { label: 'Registrar visita', icon: 'map-pin',         bg: '#E6F1FB', fg: '#185FA5' },
    { label: 'Nuevo prospecto',  icon: 'user-plus',       bg: '#EAF3DE', fg: '#3B6D11' },
    { label: 'Cotizar',          icon: 'file-text',       bg: '#FAEEDA', fg: '#854F0B' },
    { label: 'WhatsApp',         icon: 'brand-whatsapp',  bg: '#E1F5EE', fg: '#0F6E56' },
  ];
  return (
    <div style={{ margin: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {items.map(a => (
        <button key={a.label} className="kiuvo-qa" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 12px',
          background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--r-md)', textAlign: 'left',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--r-sm)',
            background: a.bg, color: a.fg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon name={a.icon} size={18} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{a.label}</div>
        </button>
      ))}
    </div>
  );
}

// ─── Agenda list ──────────────────────────────────────────────
function Agenda() {
  return (
    <div style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)' }}>Agenda de hoy</div>
        <button style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>Ver semana →</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {AGENDA.map((a, i) => {
          const stage = STAGE_BY_ID[a.stage];
          return (
            <div key={i} style={{
              background: 'var(--surface)', border: '0.5px solid var(--border)',
              borderRadius: 'var(--r-md)', padding: '10px 12px 10px 13px',
              display: 'flex', gap: 12, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, background: stage.color }} />
              <div style={{ minWidth: 42, textAlign: 'left' }}>
                <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.4, lineHeight: 1 }}>{a.time}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{a.ampm}</div>
              </div>
              <div style={{ width: 0.5, background: 'var(--border)' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                  <span style={{
                    flexShrink: 0, fontSize: 11, fontWeight: 500, color: stage.color,
                    background: stage.color + '18',
                    padding: '2px 7px', borderRadius: 'var(--r-full)',
                  }}>{a.visit}ª visita</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>{a.activity}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: 'var(--fg-tertiary)' }}>
                  <Icon name="map-pin" size={11} />
                  <span style={{ fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.address}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Funnel summary ───────────────────────────────────────────
function FunnelSummary({ onOpenKanban }) {
  return (
    <div style={{ margin: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--fg)' }}>Mi embudo</div>
        <button onClick={onOpenKanban} style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>Ver kanban →</button>
      </div>
      <div className="card">
        {FUNNEL_SUMMARY.map((row, i) => {
          const s = STAGE_BY_ID[row.id];
          return (
            <div key={row.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px',
              borderTop: i === 0 ? 'none' : '0.5px solid var(--border)',
            }}>
              <StageDot stage={row.id} />
              <span style={{ fontSize: 13, color: 'var(--fg)' }}>{s.label}</span>
              <div style={{ flex: 1 }} />
              {row.risk > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 500, color: 'var(--warning-fg)',
                  background: 'var(--warning-bg)',
                  padding: '2px 6px', borderRadius: 'var(--r-full)',
                }}>
                  <Icon name="alert-triangle" size={11} />
                  {row.risk}
                </span>
              )}
              {row.stuck > 0 && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 11, fontWeight: 500, color: 'var(--danger)',
                  background: 'var(--danger-bg)',
                  padding: '2px 6px', borderRadius: 'var(--r-full)',
                }}>
                  <Icon name="alert-circle" size={11} />
                  {row.stuck}
                </span>
              )}
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)', minWidth: 18, textAlign: 'right' }}>{row.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Reactivator banner ───────────────────────────────────────
function ReactivatorBanner() {
  return (
    <button style={{
      width: 'calc(100% - 32px)', margin: '0 16px',
      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--danger-bg)', border: '0.5px solid var(--danger-border)',
      borderRadius: 'var(--r-lg)', textAlign: 'left',
    }}>
      <Icon name="alert-circle" size={20} color="var(--danger)" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--danger-fg)' }}>Reactivador</div>
        <div style={{ fontSize: 11, color: 'var(--danger-fg-mid)' }}>4 clientes sin contacto +60 días</div>
      </div>
      <Icon name="chevron-right" size={18} color="var(--danger)" />
    </button>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────
function Dashboard({ metaState = 'mid', alertHero = false, onOpenKanban }) {
  return (
    <div style={{ paddingBottom: 92, paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 14, background: 'var(--bg)', minHeight: '100%' }}>
      <Header />
      <MetaCard state={metaState} />
      <DayStats />
      <FollowupAlert hero={alertHero} onOpen={onOpenKanban} />
      <QuickActions />
      <Agenda />
      <FunnelSummary onOpenKanban={onOpenKanban} />
      <ReactivatorBanner />
      <div style={{ height: 4 }} />
    </div>
  );
}

// ─── Kanban (swipe pills) ──────────────────────────────────────
function ProspectCard({ p, compact = false }) {
  const stage = STAGE_BY_ID[p.stage];
  const healthColor = { green: 'var(--success)', amber: 'var(--warning)', red: 'var(--danger)' }[p.health];
  const visitPct = Math.min(1, p.visits / Math.max(stage.min, 1));
  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-md)', padding: '11px 12px',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: healthColor, flexShrink: 0 }} />
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmt(p.value)}</div>
      </div>
      {/* visits progress */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--fg-secondary)' }}>
            <Icon name="map-pin" size={11} />
            <span><b style={{ fontWeight: 500, color: 'var(--fg)' }}>{p.visits}</b>/{stage.min} visitas</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{p.days} días en etapa</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
          <div style={{ width: `${visitPct * 100}%`, height: '100%', background: stage.color, borderRadius: 2 }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{p.last}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={{ width: 24, height: 24, borderRadius: 'var(--r-sm)', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="brand-whatsapp" size={13} />
          </button>
          <button style={{ width: 24, height: 24, borderRadius: 'var(--r-sm)', background: 'var(--bg-secondary)', color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="phone" size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Kanban() {
  const [activeStage, setActiveStage] = React.useState('presentacion');
  const pillsRef = React.useRef(null);
  const list = PROSPECTS.filter(p => p.stage === activeStage);
  const stage = STAGE_BY_ID[activeStage];

  // counts per stage
  const counts = Object.fromEntries(STAGES.map(s => [s.id, PROSPECTS.filter(p => p.stage === s.id).length]));
  const totalValue = list.reduce((s, p) => s + p.value, 0);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 92, display: 'flex', flexDirection: 'column' }}>
      {/* header */}
      <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="h1" style={{ marginBottom: 2 }}>Mi embudo</div>
          <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>34 prospectos · $312,400 potencial</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="search" size={17} color="var(--fg-secondary)" />
          </button>
          <button style={{ width: 36, height: 36, borderRadius: 'var(--r-md)', border: '0.5px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="adjustments-horizontal" size={17} color="var(--fg-secondary)" />
          </button>
        </div>
      </div>

      {/* stage pills (swipeable) */}
      <div ref={pillsRef} style={{
        display: 'flex', gap: 6, padding: '0 16px 12px',
        overflowX: 'auto', scrollSnapType: 'x mandatory',
      }}>
        {STAGES.map(s => {
          const on = s.id === activeStage;
          return (
            <button key={s.id} onClick={() => setActiveStage(s.id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 'var(--r-full)',
              border: '0.5px solid',
              borderColor: on ? s.color : 'var(--border)',
              background: on ? s.color : 'var(--surface)',
              color: on ? '#fff' : 'var(--fg)',
              fontSize: 12, fontWeight: 500, flexShrink: 0,
              scrollSnapAlign: 'start',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: on ? '#fff' : s.color,
              }} />
              {s.label}
              <span style={{
                fontSize: 11, fontWeight: 500,
                padding: '0 5px', borderRadius: 'var(--r-full)',
                background: on ? 'rgba(255,255,255,0.22)' : 'var(--bg-secondary)',
                color: on ? '#fff' : 'var(--fg-secondary)',
              }}>{counts[s.id]}</span>
            </button>
          );
        })}
      </div>

      {/* column summary */}
      <div style={{ margin: '0 16px 10px', padding: '10px 12px', background: stage.color + '14', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: stage.color }}>{stage.label}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 2 }}>
            Mínimo {stage.min} visita{stage.min > 1 ? 's' : ''} por prospecto · {fmt(totalValue)} potencial
          </div>
        </div>
        <button style={{
          padding: '6px 10px', borderRadius: 'var(--r-md)',
          background: stage.color, color: '#fff',
          fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Icon name="plus" size={13} />
          Añadir
        </button>
      </div>

      {/* cards */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(p => <ProspectCard key={p.id} p={p} />)}
      </div>

      {/* swipe hint */}
      <div style={{ marginTop: 16, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 4, alignItems: 'center', color: 'var(--fg-tertiary)' }}>
        <Icon name="arrows-horizontal" size={12} />
        <span style={{ fontSize: 11 }}>Desliza pills para cambiar etapa</span>
      </div>
    </div>
  );
}

// ─── Other placeholder screens ─────────────────────────────────
function MapScreen() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', padding: 16, paddingBottom: 92 }}>
      <div className="h1" style={{ marginBottom: 12 }}>Mapa</div>
      <div style={{
        height: 540, borderRadius: 'var(--r-lg)', position: 'relative', overflow: 'hidden',
        background: `repeating-linear-gradient(45deg, var(--bg-secondary), var(--bg-secondary) 8px, var(--bg-tertiary) 8px, var(--bg-tertiary) 16px)`,
        border: '0.5px solid var(--border)',
      }}>
        {/* fake pins */}
        {[
          { top: '20%', left: '30%', stage: 'presentacion' },
          { top: '40%', left: '55%', stage: 'cotizacion' },
          { top: '55%', left: '25%', stage: 'cierre' },
          { top: '70%', left: '60%', stage: 'negociacion' },
          { top: '32%', left: '70%', stage: 'prospeccion' },
        ].map((pin, i) => (
          <div key={i} style={{
            position: 'absolute', top: pin.top, left: pin.left,
            transform: 'translate(-50%, -100%)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50% 50% 50% 0',
              background: STAGE_BY_ID[pin.stage].color,
              transform: 'rotate(-45deg)',
              border: '2px solid #fff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }} />
          </div>
        ))}
        <div style={{
          position: 'absolute', bottom: 16, left: 16, right: 16,
          background: 'var(--surface)', borderRadius: 'var(--r-md)',
          padding: 12, display: 'flex', flexDirection: 'column', gap: 6,
          border: '0.5px solid var(--border)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Ruta sugerida</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>5 paradas · 23 km · 1h 45min</div>
          <button style={{ marginTop: 4, padding: '8px', background: 'var(--kiuvo-blue)', color: '#fff', borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500 }}>
            Iniciar navegación
          </button>
        </div>
      </div>
    </div>
  );
}

function PlaceholderScreen({ title, icon }) {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', padding: 16, paddingBottom: 92 }}>
      <div className="h1" style={{ marginBottom: 12 }}>{title}</div>
      <div style={{
        height: 400, border: '0.5px dashed var(--border-strong)',
        borderRadius: 'var(--r-lg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: 'var(--fg-tertiary)', gap: 8,
      }}>
        <Icon name={icon} size={32} />
        <div style={{ fontSize: 12 }}>Por diseñar</div>
      </div>
    </div>
  );
}

// ─── MobileApp wrapper ────────────────────────────────────────
function MobileApp({ metaState = 'mid', alertHero = false, initialScreen = 'inicio', dark }) {
  const [screen, setScreen] = React.useState(initialScreen);
  const goKanban = () => setScreen('embudo');

  let content;
  if (screen === 'inicio')      content = <Dashboard metaState={metaState} alertHero={alertHero} onOpenKanban={goKanban} />;
  else if (screen === 'embudo') content = <Kanban />;
  else if (screen === 'mapa')   content = <MapScreen />;
  else if (screen === 'agenda') content = <PlaceholderScreen title="Agenda" icon="calendar" />;
  else                          content = <PlaceholderScreen title="Más" icon="menu-2" />;

  return (
    <div className={`kiuvo${dark ? ' kiuvo-dark' : ''}`} style={{
      width: '100%', height: '100%', background: 'var(--bg)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* status bar */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        padding: '0 24px 6px', position: 'relative', zIndex: 5,
        background: 'var(--bg)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>9:41</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--fg)' }}>
          <Icon name="signal-4g" size={14} />
          <Icon name="wifi" size={14} />
          <Icon name="battery-3" size={16} />
        </div>
      </div>
      {/* scroll area */}
      <div style={{ position: 'absolute', top: 44, bottom: 0, left: 0, right: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        {content}
      </div>
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  );
}

Object.assign(window, { MobileApp, Dashboard, Kanban, BottomNav });
