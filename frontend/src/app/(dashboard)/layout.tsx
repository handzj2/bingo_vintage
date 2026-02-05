import Sidebar from '@/components/layout/Sidebar/Sidebar'
import Topbar from '@/components/layout/Topbar/Topbar'
import Footer from '@/components/layout/Footer/Footer'
import { useAuth } from '@/hooks/useAuth';
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main>{children}</main>
        <Footer />
      </div>
    </div>
  )
}