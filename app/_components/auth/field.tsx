type FieldProps = {
  label: string;
  name: string;
  type?: "text" | "email" | "password" | "tel";
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  readOnly?: boolean;
  ltr?: boolean;
  maxLength?: number;
};

export function Field({
  label, name, type = "text", autoComplete, defaultValue, error, hint,
  required, readOnly, ltr, maxLength,
}: FieldProps) {
  const id = `f-${name}`;
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className="q-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        required={required}
        readOnly={readOnly}
        maxLength={maxLength}
        className={ltr ? "q-ltr" : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <p id={`${id}-err`} className="q-error" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="q-hint">{hint}</p>
      ) : null}
    </div>
  );
}
