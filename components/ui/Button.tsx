import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  block?: boolean;
  loading?: boolean;
  children: ReactNode;
}

/** House-style button primitive: primary CTA, secondary and ghost variants. */
export function Button({
  variant = 'primary',
  block = false,
  loading = false,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  const classes = ['ui-btn', `ui-btn--${variant}`];
  if (block) classes.push('ui-btn--block');
  if (className) classes.push(className);
  return (
    <button
      className={classes.join(' ')}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="ui-btn__spinner" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
}
