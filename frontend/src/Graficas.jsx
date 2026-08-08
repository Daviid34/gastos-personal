import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts'
import { formatEUR, claveMes, nombreMes, nombreComercio, mesAnterior } from './utils'

const COLOR = '#1f4d3a'

export default function Graficas({ movimientos, mesSeleccionado }) {
  const delMes = useMemo(
    () => movimientos.filter((m) => claveMes(m.fecha) === mesSeleccionado && m.tipo === 'DBIT'),
    [movimientos, mesSeleccionado]
  )

  const porCategoria = useMemo(() => {
    const grupos = {}
    for (const m of delMes) {
      const cat = m.categoria || 'Otros'
      grupos[cat] = (grupos[cat] || 0) + Number(m.importe)
    }
    return Object.entries(grupos)
      .map(([categoria, importe]) => ({ categoria, importe }))
      .sort((a, b) => b.importe - a.importe)
  }, [delMes])

  const evolucionMensual = useMemo(() => {
    const grupos = {}
    for (const m of movimientos) {
      if (m.tipo !== 'DBIT') continue
      const mes = claveMes(m.fecha)
      grupos[mes] = (grupos[mes] || 0) + Number(m.importe)
    }
    return Object.entries(grupos)
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .slice(-6)
      .map(([mes, importe]) => ({ mes: nombreMes(mes).split(' ')[0].slice(0, 3), importe }))
  }, [movimientos])

  const topComercios = useMemo(() => {
    const grupos = {}
    for (const m of delMes) {
      const nombre = nombreComercio(m.descripcion)
      grupos[nombre] = (grupos[nombre] || 0) + Number(m.importe)
    }
    return Object.entries(grupos)
      .map(([nombre, importe]) => ({ nombre, importe }))
      .sort((a, b) => b.importe - a.importe)
      .slice(0, 5)
  }, [delMes])

  const comparativa = useMemo(() => {
    const mesAnt = mesAnterior(mesSeleccionado)
    const totalActual = delMes.reduce((s, m) => s + Number(m.importe), 0)
    const totalAnterior = movimientos
      .filter((m) => claveMes(m.fecha) === mesAnt && m.tipo === 'DBIT')
      .reduce((s, m) => s + Number(m.importe), 0)
    if (!totalAnterior) return null
    const variacion = ((totalActual - totalAnterior) / totalAnterior) * 100
    return { totalAnterior, variacion }
  }, [delMes, movimientos, mesSeleccionado])

  return (
    <div className="graficas">
      {comparativa && (
        <div className={`comparativa ${comparativa.variacion > 0 ? 'peor' : 'mejor'}`}>
          {comparativa.variacion > 0 ? '↑' : '↓'} {Math.abs(comparativa.variacion).toFixed(0)}%
          {' '}respecto al mes anterior ({formatEUR(comparativa.totalAnterior)})
        </div>
      )}

      <h3>Por categoría</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={porCategoria} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" tickFormatter={formatEUR} />
          <YAxis type="category" dataKey="categoria" width={100} />
          <Tooltip formatter={formatEUR} />
          <Bar dataKey="importe" fill={COLOR} />
        </BarChart>
      </ResponsiveContainer>

      <h3>Evolución últimos 6 meses</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={evolucionMensual}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mes" />
          <YAxis tickFormatter={formatEUR} width={70} />
          <Tooltip formatter={formatEUR} />
          <Line type="monotone" dataKey="importe" stroke={COLOR} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>

      <h3>Top comercios este mes</h3>
      <div className="top-comercios">
        {topComercios.map((c) => (
          <div className="fila-cat" key={c.nombre}>
            <span className="leader-text">{c.nombre}</span>
            <span className="leader-dots" />
            <span className="leader-amount">{formatEUR(c.importe)}</span>
          </div>
        ))}
        {topComercios.length === 0 && <p className="vacio">Sin datos este mes.</p>}
      </div>
    </div>
  )
}