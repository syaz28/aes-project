// Environment-based API configuration
// For local development: uses http://localhost:8000
// For production (Vercel Monorepo): uses /api prefix (same domain)

export const API_BASE_URL = import.meta.env.PROD ? "/api" : "http://localhost:8000";
