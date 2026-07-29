import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageLoader } from '@/components/ui'
import Layout from '@/components/Layout'

import Login from '@/pages/Login'
import Onboarding from '@/pages/Onboarding'

import Dashboard from '@/pages/student/Dashboard'
import TestCatalog from '@/pages/student/TestCatalog'
import TestPlayer from '@/pages/student/TestPlayer'
import TestResult from '@/pages/student/TestResult'
import History from '@/pages/student/History'
import Progress from '@/pages/student/Progress'
import Tutor from '@/pages/student/Tutor'
import Inbox from '@/pages/student/Inbox'
import Agenda from '@/pages/student/Agenda'
import Materials from '@/pages/student/Materials'

import AdminHome from '@/pages/admin/AdminHome'
import Students from '@/pages/admin/Students'
import StudentDetail from '@/pages/admin/StudentDetail'
import AdminInbox from '@/pages/admin/AdminInbox'
import Assignments from '@/pages/admin/Assignments'
import QuestionBank from '@/pages/admin/QuestionBank'
import Analytics from '@/pages/admin/Analytics'
import Billing from '@/pages/admin/Billing'
import Settings from '@/pages/admin/Settings'

export default function App() {
  const { session, profile, loading, isStaff } = useAuth()

  if (loading) return <PageLoader label="Abriendo tu autoescuela…" />

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  // Alta sin autoescuela asignada: hay que introducir el código de la academia
  if (profile && !profile.school_id) {
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        {isStaff ? (
          <>
            <Route path="/" element={<AdminHome />} />
            <Route path="/alumnos" element={<Students />} />
            <Route path="/alumnos/:id" element={<StudentDetail />} />
            <Route path="/mensajes" element={<AdminInbox />} />
            <Route path="/tareas" element={<Assignments />} />
            <Route path="/preguntas" element={<QuestionBank />} />
            <Route path="/analitica" element={<Analytics />} />
            <Route path="/cobros" element={<Billing />} />
            <Route path="/ajustes" element={<Settings />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tests" element={<TestCatalog />} />
            <Route path="/historial" element={<History />} />
            <Route path="/progreso" element={<Progress />} />
            <Route path="/tutor" element={<Tutor />} />
            <Route path="/mensajes" element={<Inbox />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/temario" element={<Materials />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>

      {/* El reproductor va fuera del layout: pantalla completa, sin distracciones */}
      <Route path="/test/:sessionId" element={<TestPlayer />} />
      <Route path="/resultado/:sessionId" element={<TestResult />} />
    </Routes>
  )
}
