const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_KEY

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

export async function getMovimientos() {
  const r = await fetch(
    `${URL}/rest/v1/movimientos?select=*&order=fecha.desc`,
    { headers }
  )
  if (!r.ok) throw new Error('No se pudieron cargar los movimientos')
  return r.json()
}

export async function updateCategoria(id, categoria) {
  const r = await fetch(`${URL}/rest/v1/movimientos?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ categoria }),
  })
  if (!r.ok) throw new Error('No se pudo actualizar la categoría')
}

export async function getIngresos() {
  const r = await fetch(
    `${URL}/rest/v1/ingresos?select=*&order=mes.desc&limit=1`,
    { headers }
  )
  if (!r.ok) throw new Error('No se pudieron cargar los ingresos')
  return r.json()
}

export async function setIngresoMesActual(importe) {
  const mes = new Date()
  mes.setDate(1)
  const mesStr = mes.toISOString().slice(0, 10)
  const r = await fetch(
    `${URL}/rest/v1/ingresos?on_conflict=mes`,
    {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify([{ mes: mesStr, importe, concepto: 'Sueldo' }]),
    }
  )
  if (!r.ok) throw new Error('No se pudo guardar el sueldo')
}

export async function deleteMovimiento(id) {
  const r = await fetch(`${URL}/rest/v1/movimientos?id=eq.${id}`, {
    method: 'DELETE',
    headers,
  })
  if (!r.ok) throw new Error('No se pudo eliminar el movimiento')
}

export async function getReglasCategoria() {
  const r = await fetch(`${URL}/rest/v1/reglas_categoria?select=*`, { headers })
  if (!r.ok) throw new Error('No se pudieron cargar las reglas de categoría')
  return r.json()
}

export async function guardarReglaCategoria(patron, categoria) {
  const r = await fetch(`${URL}/rest/v1/reglas_categoria?on_conflict=patron`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify([{ patron, categoria }]),
  })
  if (!r.ok) throw new Error('No se pudo guardar la regla de categoría')
}