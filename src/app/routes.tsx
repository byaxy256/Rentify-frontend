import { createBrowserRouter } from 'react-router';
import { AuthPage } from './components/AuthPage';
import { LandlordDashboard } from './components/LandlordDashboard';
import { TenantDashboard } from './components/TenantDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { ResetPasswordPage } from './components/ResetPasswordPage';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AuthPage,
  },
  {
    path: '/landlord',
    Component: LandlordDashboard,
  },
  {
    path: '/tenant',
    Component: TenantDashboard,
  },
  {
    path: '/admin',
    Component: AdminDashboard,
  },
  {
    path: '/auth/reset-password',
    Component: ResetPasswordPage,
  },
]);