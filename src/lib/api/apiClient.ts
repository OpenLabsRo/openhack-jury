import createApi from '$api/apiBase.js'
import { getToken } from '$lib/auth.js'

// create axios instance using resolved base URL from apiBase
const api = createApi()

// Add a request interceptor to include the token in the headers.
api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default api
