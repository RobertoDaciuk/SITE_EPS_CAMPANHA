'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import api from '@/lib/axios';

// Helper para debounce
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

interface Product {
  codigoRef: string;
  pontos: number;
  nomeProduto?: string;
}

interface Props {
  sessionId: string;
  onSelect: (product: Product) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function AsyncProductCombobox({ sessionId, onSelect, placeholder, disabled }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalInSession, setTotalInSession] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * Buscar produtos no staging
   */
  const searchProducts = useCallback(
    debounce(async (query: string) => {
      if (!sessionId) return;

      setIsLoading(true);
      try {
        const response = await api.get('/imports/staging/search', {
          params: {
            sessionId,
            q: query,
            limit: 50,
          },
        });

        setProducts(response.data.products || []);
        setTotalInSession(response.data.totalInSession || 0);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    [sessionId]
  );

  /**
   * Efeito para buscar ao digitar
   */
  useEffect(() => {
    if (isOpen) {
      searchProducts(searchTerm);
    }
  }, [searchTerm, isOpen, searchProducts]);

  /**
   * Carregar lista inicial ao abrir
   */
  useEffect(() => {
    if (isOpen && products.length === 0 && !searchTerm) {
      searchProducts('');
    }
  }, [isOpen]);

  /**
   * Fechar dropdown ao clicar fora
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  /**
   * Handler de seleção
   */
  const handleSelect = (product: Product) => {
    onSelect(product);
    setSearchTerm('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  /**
   * Limpar busca
   */
  const handleClear = () => {
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative">
      {/* Input de busca */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder || 'Buscar produto por código ou nome...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          disabled={disabled || !sessionId}
          className="w-full px-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && sessionId && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {/* Header com total */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
            {totalInSession} produto(s) na sessão
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          )}

          {/* Lista de produtos */}
          {!isLoading && products.length > 0 && (
            <ul className="py-2">
              {products.map((product, idx) => (
                <li key={`${product.codigoRef}-${idx}`}>
                  <button
                    onClick={() => handleSelect(product)}
                    className="w-full px-4 py-2 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-mono text-sm font-medium text-gray-900">
                        {product.codigoRef}
                      </p>
                      {product.nomeProduto && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {product.nomeProduto}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-indigo-600 ml-4">
                      R$ {product.pontos.toFixed(2)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Vazio */}
          {!isLoading && products.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
            </div>
          )}
        </div>
      )}

      {/* Mensagem se não há sessionId */}
      {!sessionId && (
        <p className="mt-2 text-xs text-amber-600">
          Primeiro importe os produtos no passo anterior
        </p>
      )}
    </div>
  );
}
