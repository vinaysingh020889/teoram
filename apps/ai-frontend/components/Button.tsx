export default function Button({
  children,
  type = "button",
  variant = "primary",
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  variant?: "primary" | "danger" | "warn";
}) {
  return (
    <button type={type} className={`btn btn--${variant}`}>
      {children}
    </button>
  );
}
