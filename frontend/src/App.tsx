import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import AcceptInvite from '@/pages/AcceptInvite'
import Dashboard from '@/pages/Dashboard'
import Sites from '@/pages/Sites'
import Assets from '@/pages/Assets'
import AssetDetail from '@/pages/AssetDetail'
import Alerts from '@/pages/Alerts'
import AlertDetail from '@/pages/AlertDetail'
import WorkOrders from '@/pages/WorkOrders'
import WorkOrderDetail from '@/pages/WorkOrderDetail'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'
import NotFound from '@/pages/NotFound'
import ProtectedRoute from '@/components/ProtectedRoute'

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sites" element={<Sites />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/alerts/:id" element={<AlertDetail />} />
            <Route path="/work-orders" element={<WorkOrders />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  )
}

export default App
