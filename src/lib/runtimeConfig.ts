const normalizeBase = (value: string) => value.replace(/\/$/, "");

export const getApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) {
    return normalizeBase(configured);
  }

  if (typeof window !== "undefined") {
    return normalizeBase(window.location.origin);
  }

  return "";
};
