import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes } from 'react';

interface BaseFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export interface FieldProps
  extends BaseFieldProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required'> {}

/** Labeled text/number/date input with inline error + accessible wiring. */
export function Field({ id, label, error, hint, required, ...rest }: FieldProps) {
  return (
    <div className={`ui-field${error ? ' ui-field--error' : ''}`}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
        {required ? <span className="ui-field__req" aria-hidden="true"> *</span> : null}
      </label>
      <input
        id={id}
        className="ui-field__control"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      />
      {error ? (
        <p className="ui-field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="ui-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface SelectFieldProps
  extends BaseFieldProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'required'> {
  children: ReactNode;
}

/** Labeled select with the same inline-error affordances as {@link Field}. */
export function SelectField({
  id,
  label,
  error,
  hint,
  required,
  children,
  ...rest
}: SelectFieldProps) {
  return (
    <div className={`ui-field${error ? ' ui-field--error' : ''}`}>
      <label className="ui-field__label" htmlFor={id}>
        {label}
        {required ? <span className="ui-field__req" aria-hidden="true"> *</span> : null}
      </label>
      <select
        id={id}
        className="ui-field__control"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p className="ui-field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="ui-field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
