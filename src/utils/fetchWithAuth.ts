// Define the base URL for your API.
// In development, this might fall back to localhost.
// In production (on Vercel), this will be replaced by the VITE_API_BASE_URL environment variable you set.
const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export async function fetchWithAuth(path: string, options: RequestInit = {}) {
  // Construct the full URL by combining the base URL with the provided path.
  const url = `${API_BASE_URL}${path}`;

  const token = localStorage.getItem("token");
  if (!token) {
    // It's often better to handle this scenario by redirecting to login
    // or showing a user-friendly message, rather than just throwing.
    // For now, keeping the throw as per your original code.
    throw new Error("No auth token found. Please log in.");
  }

  // Determine if the request method is GET to conditionally set Content-Type header.
  const isGet = !options.method || options.method === "GET";

  const response = await fetch(url, {
    ...options, // Spread existing options like method, body, etc.
    headers: {
      ...options.headers, // Preserve any existing headers
      Authorization: `Bearer ${token}`, // Add the authorization token
      // Only set Content-Type for non-GET requests where a body might be sent.
      ...(isGet ? {} : { "Content-Type": "application/json" }),
    },
  });

  // Handle unauthorized responses specifically.
  if (response.status === 401) {
    // You might want to clear the token and redirect to login here.
    localStorage.removeItem("token");
    // Example: window.location.href = '/login';
    throw new Error("Unauthorized: Session expired or invalid token.");
  }

  // If the response is not OK (e.g., 400, 500, but not 401 which is handled above),
  // throw an error with the response for further inspection upstream.
  if (!response.ok) {
    const errorBody = await response
      .json()
      .catch(() => ({ message: response.statusText }));
    throw new Error(
      `API Error: ${response.status} - ${errorBody.message || "Unknown error"}`
    );
  }

  return response;
}

/*
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("No auth token found.");
  }

  const isGet = !options.method || options.method === "GET";

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      ...(isGet ? {} : { "Content-Type": "application/json" }),
    },
  });

  if (response.status === 401) {
    throw new Error("unauthorized"); // or throw response to inspect status
  }

  return response;
}
*/
