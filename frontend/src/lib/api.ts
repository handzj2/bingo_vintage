const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'

export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`)
  if (!response.ok) {
    throw new Error('Failed to fetch')
  }
  return response.json()
}

export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    throw new Error('Failed to post')
  }
  return response.json()
}

// Add other methods as needed