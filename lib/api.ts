const API = process.env.NEXT_PUBLIC_API_URL || ''

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  getTemplates: () => request<any[]>('/api/templates'),
  getTemplate: (dayType: string) => request<any>(`/api/templates/${dayType}`),
  getActiveSession: () => request<any>('/api/sessions/active'),
  startSession: (template_id: number, date: string) =>
    request<any>('/api/sessions', { method: 'POST', body: JSON.stringify({ template_id, date }) }),
  completeSession: (id: number, notes?: string) =>
    request<any>(`/api/sessions/${id}`, { method: 'PATCH', body: JSON.stringify({ completed: true, notes }) }),
  deleteSession: (id: number) =>
    request<any>(`/api/sessions/${id}`, { method: 'DELETE' }),
  completeSet: (id: number, data: { completed?: boolean; actual_weight?: number; actual_reps?: number }) =>
    request<any>(`/api/sets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getSessions: (limit = 20) => request<any[]>(`/api/sessions?limit=${limit}`),
  getSession: (id: number) => request<any>(`/api/sessions/${id}`),
  getStats: () => request<any>('/api/stats'),
  getProgression: () => request<any[]>('/api/progression'),
}
