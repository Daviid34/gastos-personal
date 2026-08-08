export const CATEGORIAS = [
  'Alimentación', 'Transporte', 'Ocio', 'Suscripciones',
  'Salud', 'Vivienda', 'Compras', 'Gasolina', 'Otros',
]

const REGLAS = [
  [/mercadona|carrefour|lidl|aldi|caprabo|consum|dia %|eroski|alcampo/i, 'Alimentación'],
  [/glovo|just eat|uber eats|deliveroo/i, 'Alimentación'],
  [/renfe|hife|uber|cabify|blablacar|taxi|parking|itv|peaje/i, 'Transporte'],
  [/repsol|cepsa|shell|bp |gasolinera|estaci[oó]n de servicio|guissona|petronor|galp/i, 'Gasolina'],
  [/spotify|netflix|hbo|disney|prime video|youtube|icloud|google (one|storage)|playstation|xbox|nintendo/i, 'Suscripciones'],
  [/farmacia|clinica|cl[ií]nica|dentista|hospital|seguro (medico|salud)|mutua|fisioterap/i, 'Salud'],
  [/ryanair|vueling|booking|airbnb|trip\.com|hotel|hostal/i, 'Ocio'],
  [/restaurante|bar |cafeter[ií]a|cine|cines|concierto|entrada/i, 'Ocio'],
  [/zara|amazon|el corte|decathlon|media markt|primark|ikea|leroy merlin/i, 'Compras'],
  [/endesa|iberdrola|naturgy|repsol luz|holaluz|agua|comunidad de propietarios|alquiler|hipoteca/i, 'Vivienda'],
  [/wallapop|bizum/i, 'Otros'],
]

export function sugerirCategoria(descripcion = '', reglasAprendidas = []) {
  const desc = descripcion.toUpperCase()
  const aprendida = reglasAprendidas.find((r) => desc.includes(r.patron.toUpperCase()))
  if (aprendida) return aprendida.categoria
  const match = REGLAS.find(([re]) => re.test(descripcion))
  return match ? match[1] : 'Otros'
}

export function formatEUR(n) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n)
}

export function claveMes(fechaISO) {
  return fechaISO.slice(0, 7)
}

export function nombreMes(claveYYYYMM) {
  const [y, m] = claveYYYYMM.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  const s = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function fechaCorta(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
}

export function nombreComercio(descripcion = '') {
  return descripcion.trim().split(/\s{2,}|\d/)[0].trim()
}

export function mesAnterior(claveYYYYMM) {
  const [y, m] = claveYYYYMM.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}