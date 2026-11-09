export function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  return (
    <div className={`q-notice q-notice--${kind}`} role={kind === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}
