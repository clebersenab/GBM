// Cliente da API do GBM (backend em Rails).
const BASE = (import.meta.env.VITE_API_URL || 'https://gbm-api-dly2.onrender.com').replace(/\/$/, '')
const TOKEN_KEY = 'gbm-token'

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* navegador sem storage */ }
}

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error || 'Algo deu errado. Tente de novo.')
    this.status = status
    this.code = body?.code
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' }
  if (body) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError(0, { error: 'Sem conexão com o servidor. Ele pode estar acordando: tente de novo em alguns segundos.' })
  }
  if (res.status === 204 || res.status === 202) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    if (res.status === 401 && token && path !== '/auth/login') setToken(null)
    throw new ApiError(res.status, data)
  }
  return data
}

// Envio de arquivo (multipart). Usado pelo cadastro de histórias para subir imagens.
export async function upload(path, blob, name = 'imagem.webp') {
  const form = new FormData()
  form.append('file', blob, name)
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let res
  try {
    res = await fetch(BASE + path, { method: 'POST', headers, body: form })
  } catch {
    throw new ApiError(0, { error: 'Sem conexão com o servidor. Tente de novo em alguns segundos.' })
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, data)
  return data
}
