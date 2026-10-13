export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export async function requestJson(
  path,
  options = {},
  fallbackError = "API_REQUEST_FAILED",
) {
  const response = await fetch(`${API_URL}${path}`, options);

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("INVALID_SERVER_RESPONSE");
  }

  if (!response.ok) {
    throw new Error(data?.error || fallbackError);
  }

  return data;
}
