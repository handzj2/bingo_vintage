import { useState, useEffect } from 'react'

interface UseFetchOptions {
  method?: string
  headers?: HeadersInit
  body?: BodyInit
}

export function useFetch<T>(url: string, options?: UseFetchOptions) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(url, options)
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [url, options])

  return { data, loading, error }
}