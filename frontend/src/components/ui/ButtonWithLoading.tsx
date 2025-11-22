import { motion } from "framer-motion";
import { Loader2, LucideIcon } from "lucide-react";
import { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * ============================================================================
 * COMPONENTE: ButtonWithLoading
 * ============================================================================
 *
 * Botão inteligente com:
 * - Estado de loading automático (spinner substitui ícone)
 * - Micro-interação de hover (scale + shadow)
 * - Feedback tátil instantâneo
 * - Acessibilidade (disabled durante loading)
 *
 * Uso:
 * ```tsx
 * <ButtonWithLoading
 *   icon={Trash2}
 *   isLoading={isDeletando}
 *   onClick={handleDeletar}
 *   variant="danger"
 * >
 *   Deletar
 * </ButtonWithLoading>
 * ```
 * ============================================================================
 */

interface ButtonWithLoadingProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Ícone do Lucide (ex: Edit, Trash2, Save) */
  icon?: LucideIcon;
  /** Estado de loading (mostra spinner) */
  isLoading?: boolean;
  /** Variante de cor (primary, success, danger, warning) */
  variant?: "primary" | "success" | "danger" | "warning" | "ghost";
  /** Tamanho do botão */
  size?: "sm" | "md" | "lg";
  /** Conteúdo do botão (texto ou JSX) */
  children?: ReactNode;
  /** Mostra apenas o ícone (sem texto) */
  iconOnly?: boolean;
}

export default function ButtonWithLoading({
  icon: Icon,
  isLoading = false,
  variant = "primary",
  size = "md",
  children,
  iconOnly = false,
  className = "",
  disabled,
  ...props
}: ButtonWithLoadingProps) {

  // ========================================
  // VARIANTES DE COR
  // ========================================

  const variantClasses = {
    primary: "bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30",
    success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 active:bg-emerald-300",
    danger: "bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/30",
    warning: "bg-amber-100 text-amber-700 hover:bg-amber-200 active:bg-amber-300",
    ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
  };

  // ========================================
  // TAMANHOS
  // ========================================

  const sizeClasses = {
    sm: iconOnly ? "p-1.5" : "px-3 py-1.5 text-sm",
    md: iconOnly ? "p-2" : "px-4 py-2",
    lg: iconOnly ? "p-3" : "px-6 py-3 text-lg",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  // ========================================
  // ESTADO FINAL
  // ========================================

  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.05 } : {}}
      whileTap={!isDisabled ? { scale: 0.95 } : {}}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${!isDisabled && variant !== "ghost" ? "shadow-sm hover:shadow-md" : ""}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {/* Ícone ou Spinner */}
      {isLoading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : (
        Icon && <Icon className={iconSizes[size]} />
      )}

      {/* Texto (se não for iconOnly) */}
      {!iconOnly && children && (
        <span className="font-semibold">{children}</span>
      )}
    </motion.button>
  );
}
