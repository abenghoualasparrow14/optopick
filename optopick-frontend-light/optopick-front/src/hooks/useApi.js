import { useState, useEffect } from 'react'
export function useApi(fn, deps = []) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  useEffect(() => {
    setLoading(true); setError(null)
    fn().then(d => setData(d)).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, deps)
  return { data, loading, error }
}