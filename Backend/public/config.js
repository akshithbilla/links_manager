// Auto-detect environment based on hostname
const isLocalhost = window.location.hostname === "localhost" || 
                    window.location.hostname === "127.0.0.1" ||
                    window.location.hostname === "";

// API Base URL configuration
export const API_BASE = isLocalhost 
    ? "http://localhost:5000/api"   // Local development
    : "https://links-manager-ph6d.onrender.com/api";  // Production

// Log for debugging
console.log("🌍 Environment:", isLocalhost ? "Development" : "Production");
console.log("🔗 API Base URL:", API_BASE);

