import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute'
import { db } from './lib/store'

import Splash from './pages/Splash'
import Onboarding from './pages/Onboarding'
import SignIn from './pages/auth/SignIn'
import RoleSelect from './pages/auth/RoleSelect'
import SignUpEmployee from './pages/auth/SignUpEmployee'
import SignUpHr from './pages/auth/SignUpHr'
import VerifyEmail from './pages/auth/VerifyEmail'
import ForgotPassword from './pages/auth/ForgotPassword'

import Home from './pages/app/Home'
import Dashboard from './pages/app/Dashboard'
import Team from './pages/app/Team'
import AIInsights from './pages/app/AIInsights'
import CompanyFeed from './pages/app/CompanyFeed'
import Notifications from './pages/app/Notifications'

import { LeaveBalance, ApplyLeave, MyLeaveRequests, TeamCalendar } from './pages/leave/Leave'
import { CheckIn, AttendanceHistory, MonthlySummary } from './pages/attendance/Attendance'
import { OnboardingProgress, MyTasks, Training } from './pages/growth/Growth'
import Assistant from './pages/chat/Assistant'
import { Tickets, NewTicket, HelpdeskChat } from './pages/helpdesk/Helpdesk'
import { Overview as PerformanceOverview, Feedback } from './pages/performance/Performance'
import More from './pages/more/More'
import { Payslip, Documents, Profile, SettingsPage } from './pages/more/MoreDetails'
import { HRDashboard } from './pages/dashboards/RoleDashboards'
import IssuePayslip from './pages/payroll/IssuePayslip'

import React, { useEffect } from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-5 text-red-500">
          <h1 className="text-xl font-bold">App Crashed</h1>
          <pre className="mt-2 text-xs bg-red-50 p-2 overflow-auto">{this.state.error?.message}</pre>
          <pre className="mt-2 text-xs bg-red-50 p-2 overflow-auto">{this.state.error?.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  useEffect(() => {
    function applyTheme(data) {
      if (data?.settings?.darkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
    applyTheme(db.get())
    return db.onChange((next) => applyTheme(next))
  }, [])

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/welcome" element={<Onboarding />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<RoleSelect />} />
        <Route path="/signup/employee" element={<SignUpEmployee />} />
        <Route path="/signup/hr" element={<SignUpHr />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route path="/app/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/app/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/app/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
        <Route path="/app/ai-insights" element={<ProtectedRoute><AIInsights /></ProtectedRoute>} />
        <Route path="/app/feed" element={<ProtectedRoute><CompanyFeed /></ProtectedRoute>} />
        <Route path="/app/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

        <Route path="/app/leave" element={<ProtectedRoute><LeaveBalance /></ProtectedRoute>} />
        <Route path="/app/leave/apply" element={<ProtectedRoute><ApplyLeave /></ProtectedRoute>} />
        <Route path="/app/leave/requests" element={<ProtectedRoute><MyLeaveRequests /></ProtectedRoute>} />
        <Route path="/app/leave/calendar" element={<ProtectedRoute><TeamCalendar /></ProtectedRoute>} />

        <Route path="/app/attendance" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
        <Route path="/app/attendance/history" element={<ProtectedRoute><AttendanceHistory /></ProtectedRoute>} />
        <Route path="/app/attendance/summary" element={<ProtectedRoute><MonthlySummary /></ProtectedRoute>} />

        <Route path="/app/onboarding" element={<ProtectedRoute><OnboardingProgress /></ProtectedRoute>} />
        <Route path="/app/tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
        <Route path="/app/training" element={<ProtectedRoute><Training /></ProtectedRoute>} />

        <Route path="/app/chat" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />

        <Route path="/app/helpdesk" element={<ProtectedRoute><Tickets /></ProtectedRoute>} />
        <Route path="/app/helpdesk/new" element={<ProtectedRoute><NewTicket /></ProtectedRoute>} />
        <Route path="/app/helpdesk/chat" element={<ProtectedRoute><HelpdeskChat /></ProtectedRoute>} />

        <Route path="/app/performance" element={<ProtectedRoute><PerformanceOverview /></ProtectedRoute>} />
        <Route path="/app/performance/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />

        <Route path="/app/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
        <Route path="/app/payslip" element={<ProtectedRoute><Payslip /></ProtectedRoute>} />
        <Route path="/app/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path="/app/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/app/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

        <Route path="/app/dash/hr" element={<ProtectedRoute><RoleRoute allow={['admin']}><HRDashboard /></RoleRoute></ProtectedRoute>} />
        <Route path="/app/payroll/issue" element={<ProtectedRoute><RoleRoute allow={['admin']}><IssuePayslip /></RoleRoute></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
