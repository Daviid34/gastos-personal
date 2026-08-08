import { useEffect, useMemo, useState } from 'react'
import { getMovimientos, updateCategoria, getIngresos, setIngresoMesActual, deleteMovimiento } from './supabase'

const CATEGORIAS = [
  'Alimentación', 'Transporte', 'Ocio', 'Suscripciones',
  'Salud', 'Vivienda', 'Compras', 'Otros',
]

const REGLAS = [
  [/mercadona|carrefour|lidl|aldi|caprabo|consum/i, 'Alimentación'],
  [/renfe|hife|uber|cabify|taxi|repsol|cepsa|shell|estaci[oó]n/i, 'Transporte'],
  [/spotify|netflix|hbo|disney|prime|youtube|icloud|google/i, 'Suscripciones'],
  [/farmacia|clinica|cl[ií]nica|dentista|hospital/i, 'Salud'],
  [/ryanair|vueling|booking|airbnb|trip\.com|hotel/i, 'Ocio'],
  [/zara|amazon|el corte|decathlon|media markt/i, 'Compras'],
]

function sugerirCategoria(descripcion = '') {
  const match = REGLAS.find(([re]) => re.test(descripcion))
  return match ? match[1] : 'Otros'
}

function formatEUR(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
}

function claveMes(fechaISO) {
  return fechaISO.slice(0, 7) // YYYY-MM
}

function nombreMes(claveYYYYMM) {
  const [y, m] = claveYYYYMM.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  const s = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function fechaCorta(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
}

export default function App() {
  const [movimientos, setMovimientos] = useState([])
  const [sueldo, setSueldo] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [editandoSueldo, setEditandoSueldo] = useState(false)
  const [mesSeleccionado, setMesSeleccionado] = useState(null)
  const [abierto, setAbierto] = useState(null)

  useEffect(() => {
    async function cargar() {
      try {
        const [movs, ingresos] = await Promise.all([getMovimientos(), getIngresos()])
        setMovimientos(movs)
        setSueldo(ingresos[0]?.importe ?? null)
        const meses = [...new Set(movs.map((m) => claveMes(m.fecha)))]
        setMesSeleccionado(meses[0] ?? claveMes(new Date().toISOString()))
      } catch (e) {
        setError(e.message)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const meses = useMemo(
    () => [...new Set(movimientos.map((m) => claveMes(m.fecha)))].sort().reverse(),
    [movimientos]
  )

  const delMes = useMemo(
    () => movimientos.filter((m) => claveMes(m.fecha) === mesSeleccionado && m.tipo === 'DBIT'),
    [movimientos, mesSeleccionado]
  )

  const totalMes = useMemo(() => delMes.reduce((s, m) => s + Number(m.importe), 0), [delMes])
  const porcentaje = sueldo ? Math.min(100, (totalMes / sueldo) * 100) : 0

  const porDia = useMemo(() => {
    const grupos = {}
    for (const m of delMes) {
      grupos[m.fecha] = grupos[m.fecha] || []
      grupos[m.fecha].push(m)
    }
    return Object.entries(grupos).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [delMes])

  const porCategoria = useMemo(() => {
    const grupos = {}
    for (const m of delMes) {
      const cat = m.categoria || sugerirCategoria(m.descripcion)
      grupos[cat] = (grupos[cat] || 0) + Number(m.importe)
    }
    return Object.entries(grupos).sort((a, b) => b[1] - a[1])
  }, [delMes])

  async function cambiarCategoria(mov, categoria) {
    setMovimientos((prev) =>
      prev.map((m) => (m.id === mov.id ? { ...m, categoria } : m))
    )
    setAbierto(null)
    try {
      await updateCategoria(mov.id, categoria)
    } catch (e) {
      setError(e.message)
    }
  }

  async function eliminarMovimiento(mov) {
  if (!confirm(`¿Eliminar "${mov.descripcion}" (${formatEUR(mov.importe)})?`)) return
  setMovimientos((prev) => prev.filter((m) => m.id !== mov.id))
  setAbierto(null)
  try {
    await deleteMovimiento(mov.id)
  } catch (e) {
    setError(e.message)
  }
}

  async function guardarSueldo(valor) {
    const num = Number(valor)
    if (!num || num <= 0) return
    setSueldo(num)
    setEditandoSueldo(false)
    try {
      await setIngresoMesActual(num)
    } catch (e) {
      setError(e.message)
    }
  }

  if (cargando) {
    return (
      <div className="ticket-shell">
        <div className="loading-punch">
          <span>procesando ticket</span>
          <div className="dots"><i /><i /><i /></div>
        </div>
      </div>
    )
  }

  return (
    <div className="ticket-shell">
      <main className="receipt">
        <header className="receipt-head">
          <div className="perforation" aria-hidden="true" />
          <p className="eyebrow">Nº 001 · gastos personales</p>
          <h1>MIS CUENTAS</h1>
          <div className="rule" />
        </header>

        {error && <p className="error-line">⚠ {error}</p>}

        <section className="resumen">
          <div className="mes-selector">
            {meses.slice(0, 6).map((m) => (
              <button
                key={m}
                className={m === mesSeleccionado ? 'chip activo' : 'chip'}
                onClick={() => setMesSeleccionado(m)}
              >
                {nombreMes(m).split(' ')[0].slice(0, 3)}
              </button>
            ))}
          </div>

          <div className="linea-total">
            <span>Gastado en {nombreMes(mesSeleccionado || '')}</span>
            <span className="cifra">{formatEUR(totalMes)}</span>
          </div>

          <div className="gauge">
            <div
              className={`gauge-fill ${porcentaje > 90 ? 'alerta' : ''}`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>

          <button className="linea-sueldo" onClick={() => setEditandoSueldo(true)}>
            {sueldo ? (
              <>
                <span>{porcentaje.toFixed(0)}% de tu sueldo ({formatEUR(sueldo)})</span>
                <span className="editar">editar</span>
              </>
            ) : (
              <span>+ Configura tu sueldo para ver el %</span>
            )}
          </button>

          {editandoSueldo && (
            <form
              className="form-sueldo"
              onSubmit={(e) => {
                e.preventDefault()
                guardarSueldo(new FormData(e.target).get('sueldo'))
              }}
            >
              <input
                name="sueldo"
                type="number"
                step="0.01"
                placeholder="Sueldo neto mensual"
                defaultValue={sueldo ?? ''}
                autoFocus
              />
              <button type="submit">Guardar</button>
            </form>
          )}
        </section>

        <div className="rule dashed" />

        <section className="categorias">
          {porCategoria.map(([cat, importe]) => (
            <div className="fila-cat" key={cat}>
              <span className="leader-text">{cat}</span>
              <span className="leader-dots" />
              <span className="leader-amount">{formatEUR(importe)}</span>
            </div>
          ))}
        </section>

        <div className="rule dashed" />

        <section className="movimientos">
          {porDia.map(([fecha, movs]) => (
            <div key={fecha} className="grupo-dia">
              <p className="fecha-dia">{fechaCorta(fecha)}</p>
              {movs.map((m) => {
                const cat = m.categoria || sugerirCategoria(m.descripcion)
                return (
                  <div key={m.id} className="item-linea">
                    <button
                      className="item-toggle"
                      onClick={() => setAbierto(abierto === m.id ? null : m.id)}
                    >
                      <span className="item-desc">{m.descripcion}</span>
                      <span className="leader-dots" />
                      <span className="item-importe">{formatEUR(m.importe)}</span>
                    </button>
                    <div className="item-cat">{cat}</div>
                    {abierto === m.id && (
                      <div className="selector-cat">
                        {CATEGORIAS.map((c) => (
                          <button
                            key={c}
                            className={c === cat ? 'pill activo' : 'pill'}
                            onClick={() => cambiarCategoria(m, c)}
                          >
                            {c}
                          </button>
                        ))}
                        <button className="pill pill-borrar" onClick={() => eliminarMovimiento(m)}>
                          🗑 Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          {porDia.length === 0 && <p className="vacio">Sin movimientos este mes.</p>}
        </section>

        <footer className="receipt-foot">
          <div className="rule" />
          <p>*** gracias por llevar la cuenta ***</p>
          <div className="perforation" aria-hidden="true" />
        </footer>
      </main>
    </div>
  )
}
