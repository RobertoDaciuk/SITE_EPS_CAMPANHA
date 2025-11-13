import { useEffect, useState } from "react";

/**
 * Hook de debounce genérico.
 * Retorna o valor apenas após o período de inatividade (delay) ter passado.
 *
 * @param value Valor de entrada a ser debounceado
 * @param delay Tempo de espera em ms (default: 300ms)
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
