import axios, { AxiosProgressEvent } from 'axios'
import { getToken, clearAuth } from './auth'

// En producción, los endpoints son relativos (misma app Vercel)
const api = axios.create({ baseURL: '' })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearAuth()
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export interface DashboardData {
  data:        Record<string, unknown>[] | null
  projections: Record<string, number>
  filename:    string
  row_count:   number
  updated_at:  string
  message?:    string
}

export interface LoginResponse {
  token: string
  role:  'admin' | 'user'
}

export async function login(password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/api/auth/login', { password })
  return res.data
}

export async function getData(): Promise<DashboardData> {
  const res = await api.get<DashboardData>('/api/data')
  return res.data
}

export async function uploadFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ message: string; row_count: number; filename: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await api.post('/api/admin/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e: AxiosProgressEvent) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    },
  })
  return res.data
}

export async function downloadExcel(): Promise<Blob> {
  const res = await api.get('/api/download', { responseType: 'blob' })
  return res.data
}
