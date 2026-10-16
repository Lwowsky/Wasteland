import { createContext, useContext } from "react";

export const ContentAccessContext = createContext(null);
export function useVerifiedContentAccess(resource) {
  const status = useContext(ContentAccessContext);
  return status?.resource === resource && status.allowed ? status : null;
}
