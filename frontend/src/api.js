import axios from "axios";

// Base URL from environment
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
});

//  Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

//  Handle responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🔐 Handle unauthorized (token expired / invalid)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Redirect to login page
      window.location.href = "/login";
    }

    //  handle other errors globally
    if (error.response && error.response.status === 500) {
      console.error("Server error");
    }

    return Promise.reject(error);
  }
);

export default api;