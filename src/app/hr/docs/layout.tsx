import "@/components/hr/employee-docs-public.css";

export default function PublicEmployeeDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="hr-docs-public-layout">{children}</div>;
}
