// KIUVO CRM — Desktop admin dashboard

const dfmt = n => '$' + n.toLocaleString('es-MX');
const DIcon = ({ name, size, color, style }) => (
  <i className={`ti ti-${name}`} style={{ fontSize: size, color, ...style }} />
);

// ─── Sidebar ──────────────────────────────────────────────────
function AdminSidebar() {
  const items = [
    { id: 'dashboard', label: 'Dashboard',  icon: 'layout-dashboard', active: true },
    { id: 'pipeline',  label: 'Embudo',     icon: 'layout-kanban' },
    { id: 'prospects', label: 'Prospectos', icon: 'users' },
    { id: 'map',       label: 'Mapa',       icon: 'map-2' },
    { id: 'quotes',    label: 'Cotizaciones', icon: 'file-text' },
    { id: 'agenda',    label: 'Agenda',     icon: 'calendar' },
    { id: 'products',  label: 'Productos',  icon: 'package' },
    { id: 'team',      label: 'Equipo',     icon: 'user-square' },
    { id: 'reports',   label: 'Reportes',   icon: 'chart-bar' },
  ];
  return (
    <aside style={{
      width: 220, flexShrink: 0, background: 'var(--surface)',
      borderRight: '0.5px solid var(--border)',
      display: 'flex', flexDirection: 'column', padding: '20px 0',
    }}>
      {/* brand */}
      <div style={{ padding: '0 20px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, background: 'var(--kiuvo-blue)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 600, fontSize: 13, letterSpacing: 0.5,
        }}>K</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: 0.3, color: 'var(--fg)' }}>KIUVO</div>
          <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>CRM · Admin</div>
        </div>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, padding: '0 8px' }}>
        {items.map(it => (
          <button key={it.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 'var(--r-md)',
            background: it.active ? 'var(--kiuvo-blue-soft)' : 'transparent',
            color: it.active ? 'var(--kiuvo-blue-deep)' : 'var(--fg-secondary)',
            fontSize: 13, fontWeight: it.active ? 500 : 400, textAlign: 'left',
          }}>
            <DIcon name={it.icon} size={16} />
            <span>{it.label}</span>
          </button>
        ))}
      </nav>

      <div style={{ padding: '12px 8px', borderTop: '0.5px solid var(--border)' }}>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 'var(--r-md)',
          color: 'var(--fg-secondary)', fontSize: 13, width: '100%', textAlign: 'left',
        }}>
          <DIcon name="settings" size={16} />
          <span>Configuración</span>
        </button>
      </div>

      <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: 10, borderTop: '0.5px solid var(--border)' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500 }}>SC</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Sofía Castillo</div>
          <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>Administrador</div>
        </div>
      </div>
    </aside>
  );
}

// ─── Top bar ──────────────────────────────────────────────────
function AdminTopBar() {
  const periods = ['Hoy', 'Semana', 'Mes', 'Trimestre', 'Personalizado'];
  const [period, setPeriod] = React.useState('Semana');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 28px', borderBottom: '0.5px solid var(--border)',
      background: 'var(--bg)',
    }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.3 }}>Dashboard</div>
        <div style={{ fontSize: 12, color: 'var(--fg-secondary)', marginTop: 2 }}>Semana del 12 al 18 de mayo</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', background: 'var(--surface)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--r-md)', minWidth: 220, color: 'var(--fg-tertiary)',
        }}>
          <DIcon name="search" size={14} />
          <span style={{ fontSize: 12 }}>Buscar prospecto, empresa…</span>
        </div>
        {/* period segmented */}
        <div style={{
          display: 'inline-flex', background: 'var(--surface)',
          border: '0.5px solid var(--border)', borderRadius: 'var(--r-md)', padding: 2,
        }}>
          {periods.map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 12px', fontSize: 12,
              fontWeight: period === p ? 500 : 400,
              color: period === p ? 'var(--fg)' : 'var(--fg-secondary)',
              background: period === p ? 'var(--bg-secondary)' : 'transparent',
              borderRadius: 'var(--r-sm)',
            }}>{p}</button>
          ))}
        </div>
        <button style={{
          padding: '7px 12px', background: 'var(--kiuvo-blue)', color: '#fff',
          borderRadius: 'var(--r-md)', fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <DIcon name="download" size={13} />
          Exportar
        </button>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────
function KPI({ label, value, sub, delta, deltaKind, accent, sparkline }) {
  const deltaColor = deltaKind === 'good' ? 'var(--success)' : deltaKind === 'bad' ? 'var(--danger)' : 'var(--fg-secondary)';
  return (
    <div style={{
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative', overflow: 'hidden',
    }}>
      {accent && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent }} />
      )}
      <div style={{ fontSize: 12, color: 'var(--fg-secondary)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--fg)', letterSpacing: -0.5, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {delta && (
          <div style={{ fontSize: 12, fontWeight: 500, color: deltaColor, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <DIcon name={deltaKind === 'bad' ? 'arrow-down-right' : 'arrow-up-right'} size={12} />
            {delta}
          </div>
        )}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>{sub}</div>}
      {sparkline && (
        <div style={{ marginTop: 4 }}>
          <Sparkline data={sparkline} color={accent || 'var(--kiuvo-blue)'} />
        </div>
      )}
    </div>
  );
}

function Sparkline({ data, color, width = 200, height = 36 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2]);
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const areaPath = path + ` L${width},${height} L0,${height} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={areaPath} fill={color} opacity="0.10" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Sales chart (column) ─────────────────────────────────────
function SalesChart() {
  const data = [
    { d: 'Lun', won: 42000, target: 35000 },
    { d: 'Mar', won: 38000, target: 35000 },
    { d: 'Mié', won: 51000, target: 35000 },
    { d: 'Jue', won: 29000, target: 35000 },
    { d: 'Vie', won: 64000, target: 35000 },
    { d: 'Sáb', won: 22000, target: 35000 },
    { d: 'Dom', won: 12000, target: 35000 },
  ];
  const max = 70000;
  return (
    <div className="card" style={{ padding: 20, gridColumn: 'span 8', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Ventas por día</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Cierres ganados vs. meta diaria</div>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--fg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--kiuvo-blue)' }} />Ganado</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 2, background: 'var(--fg-tertiary)' }} />Meta diaria</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 200, position: 'relative', padding: '0 0 24px' }}>
        {/* target line */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 24 + (data[0].target / max) * 176, height: 0, borderTop: '0.5px dashed var(--fg-tertiary)' }} />
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
            <div style={{ fontSize: 10, color: 'var(--fg-secondary)', marginBottom: 4, fontVariantNumeric: 'tabular-nums' }}>
              {d.won >= 1000 ? '$' + (d.won / 1000).toFixed(0) + 'k' : ''}
            </div>
            <div style={{
              width: '100%', maxWidth: 38,
              height: `${(d.won / max) * 100}%`,
              background: d.won >= d.target ? 'var(--kiuvo-blue)' : 'var(--kiuvo-blue-mid)',
              borderRadius: '4px 4px 0 0',
            }} />
            <div style={{ position: 'absolute', bottom: 0, fontSize: 11, color: 'var(--fg-secondary)', marginTop: 6, transform: 'translateY(20px)' }}>{d.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Funnel visualization ─────────────────────────────────────
function FunnelChart() {
  const data = [
    { id: 'prospeccion',  label: 'Prospección',  count: 142, value: 1820000 },
    { id: 'presentacion', label: 'Presentación', count: 86,  value: 1240000 },
    { id: 'cotizacion',   label: 'Cotización',   count: 48,  value: 820000 },
    { id: 'negociacion',  label: 'Negociación',  count: 27,  value: 460000 },
    { id: 'cierre',       label: 'Cierre',       count: 12,  value: 248000 },
  ];
  const max = data[0].count;
  return (
    <div className="card" style={{ padding: 20, gridColumn: 'span 4', background: 'var(--surface)' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Embudo de ventas</div>
        <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Distribución actual del pipeline</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((row, i) => {
          const stage = STAGE_BY_ID[row.id];
          const width = (row.count / max) * 100;
          const prev = i > 0 ? data[i - 1].count : null;
          const conv = prev ? Math.round((row.count / prev) * 100) : null;
          return (
            <div key={row.id}>
              {conv !== null && (
                <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', textAlign: 'center', padding: '1px 0' }}>
                  ↓ {conv}% conversión
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 90, fontSize: 12, color: 'var(--fg)', fontWeight: 500 }}>{row.label}</div>
                <div style={{ flex: 1, position: 'relative', height: 30 }}>
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    width: `${width}%`, background: stage.color + '24',
                    borderLeft: `3px solid ${stage.color}`,
                    borderRadius: '0 4px 4px 0',
                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{row.count}</span>
                  </div>
                </div>
                <div style={{ width: 60, textAlign: 'right', fontSize: 11, color: 'var(--fg-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                  ${(row.value / 1000).toFixed(0)}k
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Team table ───────────────────────────────────────────────
function TeamTable() {
  return (
    <div className="card" style={{ padding: 0, gridColumn: 'span 8', background: 'var(--surface)' }}>
      <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Equipo de ventas</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>5 vendedores · ordenado por cumplimiento de seguimiento</div>
        </div>
        <button style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>Ver todos →</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)' }}>
              {['Vendedor', 'Meta', 'Avance', 'Prospectos', 'Cumplimiento', 'Estancados', 'Ganado'].map((h, i) => (
                <th key={i} style={{
                  padding: '8px 14px', textAlign: i === 0 ? 'left' : 'right',
                  fontSize: 11, fontWeight: 500, color: 'var(--fg-secondary)',
                  borderBottom: '0.5px solid var(--border)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...SELLERS].sort((a, b) => b.compliance - a.compliance).map(s => {
              const pct = Math.round((s.current / s.goal) * 100);
              const compColor = s.compliance >= 85 ? 'var(--success)' : s.compliance >= 75 ? 'var(--warning)' : 'var(--danger)';
              return (
                <tr key={s.id}>
                  <td style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: s.color + '22', color: s.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 500,
                      }}>{s.init}</div>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--fg)' }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>Querétaro · Activo hoy</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', fontVariantNumeric: 'tabular-nums', color: 'var(--fg-secondary)' }}>{dfmt(s.goal)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{ fontWeight: 500, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
                      <div style={{ width: 80, height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: pct >= 80 ? 'var(--success)' : 'var(--kiuvo-blue)' }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}>{s.prospects}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 'var(--r-full)',
                      background: compColor + '18', color: compColor,
                      fontWeight: 500, fontVariantNumeric: 'tabular-nums', fontSize: 11,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: compColor }} />
                      {s.compliance}%
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', fontVariantNumeric: 'tabular-nums', color: s.stuck > 0 ? 'var(--danger)' : 'var(--fg-tertiary)' }}>
                    {s.stuck > 0 ? s.stuck : '—'}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', borderBottom: '0.5px solid var(--border)', fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: 'var(--fg)' }}>{dfmt(s.won)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Activity feed ────────────────────────────────────────────
function ActivityFeed() {
  const kindIcon = {
    win: { icon: 'trophy', color: 'var(--success)' },
    visit: { icon: 'map-pin', color: 'var(--kiuvo-blue)' },
    quote: { icon: 'file-text', color: 'var(--warning)' },
    add: { icon: 'user-plus', color: 'var(--info)' },
    stage: { icon: 'arrow-right', color: 'var(--stage-negociacion)' },
    msg: { icon: 'brand-whatsapp', color: 'var(--success)' },
  };
  return (
    <div className="card" style={{ padding: 0, gridColumn: 'span 4', background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Actividad reciente</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>En vivo</div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: 'var(--success)', fontWeight: 500,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)' }} />
          activo
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {ACTIVITY_FEED.map((a, i) => {
          const k = kindIcon[a.kind];
          return (
            <div key={i} style={{
              padding: '10px 18px', display: 'flex', gap: 10, alignItems: 'flex-start',
              borderBottom: i < ACTIVITY_FEED.length - 1 ? '0.5px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: k.color + '18', color: k.color, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <DIcon name={k.icon} size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--fg)', lineHeight: 1.45 }}>
                  <b style={{ fontWeight: 500 }}>{a.who}</b>{' '}
                  <span style={{ color: 'var(--fg-secondary)' }}>{a.what}</span>{' '}
                  <b style={{ fontWeight: 500 }}>{a.target}</b>
                  {a.amount && <span style={{ color: 'var(--fg-secondary)' }}> · {a.amount}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg-tertiary)', marginTop: 2 }}>{a.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Geo heatmap ──────────────────────────────────────────────
function GeoHeatmap() {
  // fake heat grid
  const cells = [];
  for (let i = 0; i < 8 * 5; i++) {
    const v = Math.random();
    cells.push(v);
  }
  return (
    <div className="card" style={{ padding: 20, gridColumn: 'span 6', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Actividad geográfica</div>
          <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Visitas registradas en Querétaro · últimos 7 días</div>
        </div>
        <button style={{ fontSize: 12, color: 'var(--kiuvo-blue)', fontWeight: 500 }}>Abrir mapa →</button>
      </div>
      <div style={{
        height: 200, borderRadius: 'var(--r-md)', overflow: 'hidden',
        background: 'var(--bg-secondary)', position: 'relative',
        backgroundImage: `linear-gradient(0deg, var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }}>
        {/* Pins clustered */}
        {[
          { top: '25%', left: '20%', n: 12 },
          { top: '40%', left: '45%', n: 28 },
          { top: '60%', left: '32%', n: 18 },
          { top: '30%', left: '70%', n: 8 },
          { top: '70%', left: '65%', n: 5 },
          { top: '50%', left: '85%', n: 14 },
        ].map((c, i) => {
          const size = 20 + c.n * 1.4;
          return (
            <div key={i} style={{
              position: 'absolute', top: c.top, left: c.left,
              transform: 'translate(-50%, -50%)',
              width: size, height: size, borderRadius: '50%',
              background: 'var(--kiuvo-blue)', opacity: 0.25 + c.n * 0.015,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 500,
              border: '2px solid #fff',
            }}>{c.n}</div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Alerts panel ─────────────────────────────────────────────
function AlertsPanel() {
  const alerts = [
    { kind: 'red',   icon: 'alert-circle',     title: '4 prospectos estancados',   sub: '>21 días en la misma etapa · 3 vendedores' },
    { kind: 'red',   icon: 'history',          title: '12 clientes a reactivar',   sub: '>60 días sin contacto · $186k potencial' },
    { kind: 'amber', icon: 'file-text',        title: '6 cotizaciones por vencer', sub: 'Vencen en los próximos 3 días' },
    { kind: 'amber', icon: 'eye-exclamation',  title: '9 prospectos en riesgo',    sub: 'Faltan visitas para el mínimo de etapa' },
    { kind: 'info',  icon: 'calendar-event',   title: '23 citas mañana',           sub: 'Distribuidas entre 5 vendedores' },
  ];
  const tone = {
    red:   { bg: 'var(--danger-bg)',  border: 'var(--danger-border)',  fg: 'var(--danger)',     text: 'var(--danger-fg)' },
    amber: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', fg: 'var(--warning-fg)', text: 'var(--warning-fg)' },
    info:  { bg: 'var(--kiuvo-blue-soft)', border: 'var(--kiuvo-blue-mid)', fg: 'var(--kiuvo-blue)', text: 'var(--kiuvo-blue-deep)' },
  };
  return (
    <div className="card" style={{ padding: 0, gridColumn: 'span 6', background: 'var(--surface)' }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)' }}>Alertas operativas</div>
        <div style={{ fontSize: 11, color: 'var(--fg-secondary)' }}>Requieren tu atención esta semana</div>
      </div>
      <div>
        {alerts.map((a, i) => {
          const t = tone[a.kind];
          return (
            <div key={i} style={{
              padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: i < alerts.length - 1 ? '0.5px solid var(--border)' : 'none',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--r-md)',
                background: t.bg, color: t.fg, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '0.5px solid ' + t.border,
              }}>
                <DIcon name={a.icon} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-secondary)', marginTop: 1 }}>{a.sub}</div>
              </div>
              <DIcon name="chevron-right" size={16} color="var(--fg-tertiary)" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main admin layout ────────────────────────────────────────
function AdminDashboard({ dark }) {
  return (
    <div className={`kiuvo${dark ? ' kiuvo-dark' : ''}`} style={{
      width: '100%', height: '100%', display: 'flex',
      background: 'var(--bg)', color: 'var(--fg)', overflow: 'hidden',
    }}>
      <AdminSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AdminTopBar />
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 28px' }}>
          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 16 }}>
            <KPI label="Ventas totales"            value="$758k" delta="+12%" deltaKind="good" sub="vs semana anterior"
                 accent="var(--kiuvo-blue)" sparkline={SALES_TREND} />
            <KPI label="Prospectos activos"        value="142"   delta="+8"   deltaKind="good" sub="34 nuevos esta semana"
                 accent="var(--info)" />
            <KPI label="Tasa de conversión"        value="18.4%" delta="+2.1pp" deltaKind="good" sub="prospección → cierre"
                 accent="var(--success)" />
            <KPI label="Ticket promedio"           value="$24.6k" delta="-3%"  deltaKind="bad" sub="ventas ganadas"
                 accent="var(--stage-cotizacion)" />
            <KPI label="Cumplimiento seguimiento"  value="82%"   delta="+4pp" deltaKind="good" sub="prospectos con ≥ visitas mín."
                 accent="var(--warning)" />
            <KPI label="Visitas por venta ganada"  value="6.4"   delta=""     deltaKind="" sub="vs 2.8 en perdidas"
                 accent="var(--stage-negociacion)" />
          </div>

          {/* Sales + Funnel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12, marginBottom: 16 }}>
            <SalesChart />
            <FunnelChart />
          </div>

          {/* Team + Activity */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12, marginBottom: 16 }}>
            <TeamTable />
            <ActivityFeed />
          </div>

          {/* Heatmap + Alerts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 12 }}>
            <GeoHeatmap />
            <AlertsPanel />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminDashboard });
