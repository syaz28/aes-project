// Environment-based API configuration
// For local development: uses http://localhost:8000
// For production (Vercel): set VITE_API_URL environment variable to Render backend URL

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
