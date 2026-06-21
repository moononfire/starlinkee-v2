export default function PlateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "#f9fafb", color: "#111827", minHeight: "100vh" }}>
      {children}
    </div>
  );
}
