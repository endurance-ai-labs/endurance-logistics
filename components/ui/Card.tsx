import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Surface primitive used for the quote result and the load summary. */
export function Card({ children, className, ...rest }: CardProps) {
  return (
    <div className={`ui-card${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...rest }: CardProps) {
  return (
    <div className={`ui-card__header${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </div>
  );
}

export function CardBody({ children, className, ...rest }: CardProps) {
  return (
    <div className={`ui-card__body${className ? ` ${className}` : ''}`} {...rest}>
      {children}
    </div>
  );
}
