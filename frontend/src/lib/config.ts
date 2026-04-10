const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export const appConfig = {
  apiBaseUrl,
  backendOrigin: apiBaseUrl.replace(/\/api\/?$/, ""),
};
