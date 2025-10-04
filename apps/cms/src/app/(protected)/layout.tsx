import CMSLayout from "../../../components/CMSLayout";
import RequireAuth from "../../components/RequireAuth";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <CMSLayout>{children}</CMSLayout>
    </RequireAuth>
  );
}
