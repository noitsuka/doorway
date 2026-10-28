import { useEffect, useState } from "react";

export function useOcupado() {
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => () => setOcupado(false), []);
  return [ocupado, setOcupado] as const;
}
