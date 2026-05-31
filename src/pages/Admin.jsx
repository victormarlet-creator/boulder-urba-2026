import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD

// ─── Login Admin ────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    if (pwd === ADMIN_PASSWORD) {
      onLogin()
    } else {
      setError('Contrasenya incorrecta.')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-rock)] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h1 className="font-display text-3xl mb-5">PANELL ADMIN</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">Contrasenya</label>
            <input
              type="password"
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              className="input"
              placeholder="Contrasenya d'administrador"
              autoFocus
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-primary w-full">Entrar</button>
        </form>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-2xl text-[var(--color-rock)] mb-3 border-b-2 border-[var(--color-chalk-dark)] pb-1">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-chalk-dark)]">
          <h3 className="font-display text-xl">{title}</h3>
          <button onClick={onClose} className="text-2xl text-[var(--color-stone)] hover:text-[var(--color-rock)]">×</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

// ─── Admin Principal ─────────────────────────────────────────
export default function Admin() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [tab, setTab] = useState('settings')
  const [data, setData] = useState({
    participants: [], problems: [], sectors: [], categories: [],
    ascents: [], settings: [], premiumRules: []
  })
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // { type, item }

  useEffect(() => {
    if (loggedIn) loadAll()
  }, [loggedIn])

  const loadAll = async () => {
    setLoading(true)
    const [parts, probs, sects, cats, asc, sets, prules] = await Promise.all([
      supabase.from('participants').select('*, categories(name)').order('dorsal'),
      supabase.from('problems').select('*, sectors(name), categories(name)').order('number'),
      supabase.from('sectors').select('*').order('name'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('ascents').select('*, participants(name, dorsal), problems(number, name)').order('registered_at', { ascending: false }).limit(200),
      supabase.from('settings').select('*'),
      supabase.from('premium_rules').select('*').order('min_premiums'),
    ])
    setData({
      participants: parts.data || [],
      problems: probs.data || [],
      sectors: sects.data || [],
      categories: cats.data || [],
      ascents: asc.data || [],
      settings: sets.data || [],
      premiumRules: prules.data || [],
    })
    setLoading(false)
  }

  if (!loggedIn) return <AdminLogin onLogin={() => setLoggedIn(true)} />

  const tabs = [
    { id: 'settings',      label: '⚙️ Config' },
    { id: 'participants',  label: '👤 Participants' },
    { id: 'problems',      label: '🧗 Blocs' },
    { id: 'sectors',       label: '📍 Sectors' },
    { id: 'results',       label: '📊 Resultats' },
  ]

  return (
    <div className="min-h-screen bg-[var(--color-chalk)]">
      {/* Header */}
      <div className="bg-[var(--color-rock)] text-white px-4 py-3 flex items-center justify-between">
        <h1 className="font-display text-2xl tracking-wider">⚙️ ADMIN</h1>
        <button onClick={() => setLoggedIn(false)} className="text-sm text-gray-400 hover:text-white">Sortir</button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[var(--color-chalk-dark)] overflow-x-auto">
        <div className="flex min-w-max px-2">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[var(--color-summit)] text-[var(--color-summit)]'
                  : 'border-transparent text-[var(--color-stone)] hover:text-[var(--color-rock)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        {loading && <p className="text-center py-4 text-[var(--color-stone)]">Carregant...</p>}

        {/* ── SETTINGS ── */}
        {tab === 'settings' && <SettingsTab settings={data.settings} onSave={loadAll} />}

        {/* ── PARTICIPANTS ── */}
        {tab === 'participants' && (
          <ParticipantsTab
            participants={data.participants}
            categories={data.categories}
            onReload={loadAll}
          />
        )}

        {/* ── PROBLEMS ── */}
        {tab === 'problems' && (
          <ProblemsTab
            problems={data.problems}
            sectors={data.sectors}
            categories={data.categories}
            onReload={loadAll}
          />
        )}

        {/* ── SECTORS ── */}
        {tab === 'sectors' && (
          <SectorsTab sectors={data.sectors} onReload={loadAll} />
        )}

        {/* ── RESULTS ── */}
        {tab === 'results' && (
          <ResultsTab ascents={data.ascents} participants={data.participants} onReload={loadAll} />
        )}
      </div>
    </div>
  )
}

// ─── Settings Tab ────────────────────────────────────────────
function SettingsTab({ settings, onSave }) {
  const getSetting = (key) => settings.find(s => s.key === key)?.value || ''

  const updateSetting = async (key, value) => {
    await supabase.from('settings').update({ value }).eq('key', key)
    onSave()
  }

  return (
    <Section title="Configuració">
      <div className="space-y-4">
        <ToggleSetting
          label="Competició oberta"
          description="Permet als participants registrar ascents"
          value={getSetting('competition_open') === 'true'}
          onChange={v => updateSetting('competition_open', v ? 'true' : 'false')}
        />
        <ToggleSetting
          label="Classificació pública"
          description="Qualsevol pot veure el rànquing"
          value={getSetting('ranking_public') === 'true'}
          onChange={v => updateSetting('ranking_public', v ? 'true' : 'false')}
        />
      </div>
    </Section>
  )
}

function ToggleSetting({ label, description, value, onChange }) {
  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="font-semibold text-[var(--color-rock)]">{label}</p>
        <p className="text-xs text-[var(--color-stone)]">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-14 h-8 rounded-full transition-colors relative ${
          value ? 'bg-[var(--color-green)]' : 'bg-[var(--color-chalk-dark)]'
        }`}
      >
        <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${
          value ? 'left-7' : 'left-1'
        }`} />
      </button>
    </div>
  )
}

// ─── Participants Tab ────────────────────────────────────────
function ParticipantsTab({ participants, categories, onReload }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const openNew = () => {
    setForm({ dorsal: '', private_code: '', name: '', category_id: categories[0]?.id || '', active: true })
    setEditing('new')
  }
  const openEdit = (p) => {
    setForm({ ...p })
    setEditing(p.id)
  }
  const closeModal = () => { setEditing(null); setMsg('') }

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      const payload = {
        dorsal: form.dorsal,
        private_code: form.private_code,
        name: form.name,
        category_id: parseInt(form.category_id),
        active: form.active,
      }
      if (editing === 'new') {
        const { error } = await supabase.from('participants').insert(payload)
        if (error) { setMsg('Error: ' + error.message); return }
      } else {
        const { error } = await supabase.from('participants').update(payload).eq('id', editing)
        if (error) { setMsg('Error: ' + error.message); return }
      }
      onReload()
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (p) => {
    await supabase.from('participants').update({ active: !p.active }).eq('id', p.id)
    onReload()
  }

  return (
    <Section title={`Participants (${participants.length})`}>
      <button onClick={openNew} className="btn-primary mb-4">+ Afegir participant</button>

      <div className="space-y-2">
        {participants.map(p => (
          <div key={p.id} className={`card flex items-center justify-between ${!p.active ? 'opacity-50' : ''}`}>
            <div>
              <span className="font-bold text-[var(--color-rock)]">#{p.dorsal}</span>
              <span className="ml-2">{p.name}</span>
              <p className="text-xs text-[var(--color-stone)]">{p.categories?.name} · codi: {p.private_code}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="btn-secondary py-1.5 px-3 text-sm">✏️</button>
              <button
                onClick={() => toggleActive(p)}
                className={`py-1.5 px-3 text-sm rounded-xl border-2 font-semibold ${p.active ? 'border-red-200 text-red-500' : 'border-green-200 text-green-600'}`}
              >
                {p.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Nou participant' : 'Editar participant'} onClose={closeModal}>
          <div className="space-y-3">
            <div>
              <label className="label">Dorsal</label>
              <input className="input" value={form.dorsal} onChange={e => setForm({ ...form, dorsal: e.target.value })} />
            </div>
            <div>
              <label className="label">Nom complet</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Codi privat</label>
              <input className="input" value={form.private_code} onChange={e => setForm({ ...form, private_code: e.target.value })} />
            </div>
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {msg && <p className="text-red-600 text-sm">{msg}</p>}
            <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
              {saving ? 'Guardant...' : 'Guardar'}
            </button>
          </div>
        </Modal>
      )}
    </Section>
  )
}

// ─── Problems Tab ─────────────────────────────────────────────
function ProblemsTab({ problems, sectors, categories, onReload }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const emptyForm = {
    number: '', name: '', sector_id: sectors[0]?.id || '',
    category_id: '', grade: '', modality: 'Boulder',
    points_1: 100, points_2: 80, points_3: 60, points_4plus: 50,
    is_premium: false, active: true, notes: ''
  }

  const openNew = () => { setForm(emptyForm); setEditing('new') }
  const openEdit = (p) => { setForm({ ...p }); setEditing(p.id) }
  const closeModal = () => { setEditing(null); setMsg('') }

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      const payload = {
        number: parseInt(form.number),
        name: form.name || null,
        sector_id: parseInt(form.sector_id),
        category_id: form.category_id ? parseInt(form.category_id) : null,
        grade: form.grade || null,
        modality: form.modality,
        points_1: parseInt(form.points_1),
        points_2: parseInt(form.points_2),
        points_3: parseInt(form.points_3),
        points_4plus: parseInt(form.points_4plus),
        is_premium: !!form.is_premium,
        active: !!form.active,
        notes: form.notes || null,
      }
      if (editing === 'new') {
        const { error } = await supabase.from('problems').insert(payload)
        if (error) { setMsg('Error: ' + error.message); return }
      } else {
        const { error } = await supabase.from('problems').update(payload).eq('id', editing)
        if (error) { setMsg('Error: ' + error.message); return }
      }
      onReload()
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title={`Blocs (${problems.length})`}>
      <button onClick={openNew} className="btn-primary mb-4">+ Afegir bloc</button>

      <div className="space-y-2">
        {problems.map(p => (
          <div key={p.id} className={`card flex items-center justify-between ${!p.active ? 'opacity-50' : ''}`}>
            <div>
              <span className="font-bold">#{p.number}</span>
              {p.name && <span className="ml-1 text-sm">{p.name}</span>}
              {p.is_premium && <span className="badge-premium ml-2">⭐ P</span>}
              <p className="text-xs text-[var(--color-stone)]">
                {p.sectors?.name} · {p.grade || 'sense grau'} · {p.categories?.name || 'totes les categories'}
              </p>
              <p className="text-xs text-[var(--color-stone)]">
                Pts: {p.points_1} / {p.points_2} / {p.points_3} / {p.points_4plus}
              </p>
            </div>
            <button onClick={() => openEdit(p)} className="btn-secondary py-1.5 px-3 text-sm">✏️</button>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Nou bloc' : 'Editar bloc'} onClose={closeModal}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Número</label>
                <input type="number" className="input" value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} />
              </div>
              <div>
                <label className="label">Grau</label>
                <input className="input" value={form.grade} onChange={e => setForm({ ...form, grade: e.target.value })} placeholder="ex: 6a" />
              </div>
            </div>
            <div>
              <label className="label">Nom (opcional)</label>
              <input className="input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Sector</label>
              <select className="input" value={form.sector_id} onChange={e => setForm({ ...form, sector_id: e.target.value })}>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Categoria (opcional – deixa buit = totes)</label>
              <select className="input" value={form.category_id || ''} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Totes les categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Modalitat</label>
              <input className="input" value={form.modality} onChange={e => setForm({ ...form, modality: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['points_1','1r intent'],['points_2','2n intent'],['points_3','3r intent'],['points_4plus','4t o +']].map(([key, lbl]) => (
                <div key={key}>
                  <label className="label">{lbl}</label>
                  <input type="number" className="input" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.is_premium} onChange={e => setForm({ ...form, is_premium: e.target.checked })} className="w-5 h-5" />
                <span className="font-semibold text-[var(--color-premium)]">⭐ Premium</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.active} onChange={e => setForm({ ...form, active: e.target.checked })} className="w-5 h-5" />
                <span className="font-semibold">Actiu</span>
              </label>
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            {msg && <p className="text-red-600 text-sm">{msg}</p>}
            <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
              {saving ? 'Guardant...' : 'Guardar'}
            </button>
          </div>
        </Modal>
      )}
    </Section>
  )
}

// ─── Sectors Tab ─────────────────────────────────────────────
function SectorsTab({ sectors, onReload }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  const openNew = () => { setForm({ name: '', description: '' }); setEditing('new') }
  const openEdit = (s) => { setForm({ ...s }); setEditing(s.id) }
  const closeModal = () => setEditing(null)

  const handleSave = async () => {
    setSaving(true)
    if (editing === 'new') {
      await supabase.from('sectors').insert({ name: form.name, description: form.description || null })
    } else {
      await supabase.from('sectors').update({ name: form.name, description: form.description || null }).eq('id', editing)
    }
    setSaving(false)
    onReload()
    closeModal()
  }

  const handleDelete = async (id) => {
    if (!confirm('Segur que vols eliminar aquest sector? Assegura\'t que no té blocs assignats.')) return
    await supabase.from('sectors').delete().eq('id', id)
    onReload()
  }

  return (
    <Section title="Sectors">
      <button onClick={openNew} className="btn-primary mb-4">+ Afegir sector</button>
      <div className="space-y-2">
        {sectors.map(s => (
          <div key={s.id} className="card flex items-center justify-between">
            <div>
              <p className="font-semibold">{s.name}</p>
              {s.description && <p className="text-xs text-[var(--color-stone)]">{s.description}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(s)} className="btn-secondary py-1.5 px-3 text-sm">✏️</button>
              <button onClick={() => handleDelete(s.id)} className="py-1.5 px-3 text-sm rounded-xl border-2 border-red-200 text-red-500">🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? 'Nou sector' : 'Editar sector'} onClose={closeModal}>
          <div className="space-y-3">
            <div>
              <label className="label">Nom</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Descripció (opcional)</label>
              <input className="input" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
              {saving ? 'Guardant...' : 'Guardar'}
            </button>
          </div>
        </Modal>
      )}
    </Section>
  )
}

// ─── Results Tab ─────────────────────────────────────────────
function ResultsTab({ ascents, participants, onReload }) {
  const exportCSV = () => {
    const header = ['Dorsal', 'Participant', 'Problema', 'Intents', 'Punts', 'Data']
    const rows = ascents.map(a => [
      a.participants?.dorsal || '',
      a.participants?.name || '',
      `#${a.problems?.number} ${a.problems?.name || ''}`.trim(),
      a.attempts,
      a.points_earned,
      new Date(a.registered_at).toLocaleString('ca-ES'),
    ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resultats_boulder_collbato.csv'
    a.click()
  }

  return (
    <Section title="Resultats">
      <div className="flex gap-3 mb-4">
        <button onClick={exportCSV} className="btn-primary">⬇️ Exportar CSV</button>
        <button onClick={onReload} className="btn-secondary">🔄 Actualitzar</button>
      </div>

      <p className="text-sm text-[var(--color-stone)] mb-3">{ascents.length} ascents registrats</p>

      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {ascents.map(a => (
          <div key={a.id} className="card py-2 px-3 flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm">{a.participants?.name}</span>
              <span className="text-xs text-[var(--color-stone)] ml-2">#{a.participants?.dorsal}</span>
              <p className="text-xs text-[var(--color-stone)]">
                Bloc #{a.problems?.number} {a.problems?.name || ''} · {a.attempts} intent{a.attempts > 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl text-[var(--color-summit)]">{a.points_earned}</p>
              <p className="text-xs text-[var(--color-stone)]">pts</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}
