import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import BoardPage from '../pages/BoardPage';
import AppLayout from '../components/layout/AppLayout';

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Rotas autenticadas dentro do AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/boards/:boardId" element={<BoardPage />} />
        <Route path="/projects" element={<PlaceholderPage title="Projetos" />} />
        <Route path="/documents" element={<PlaceholderPage title="Documentos (GED)" />} />
        <Route path="/reports" element={<PlaceholderPage title="Relatórios" />} />
        <Route path="/profile" element={<PlaceholderPage title="Perfil" />} />
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-2 text-muted-foreground">Em construção...</p>
      </div>
    </div>
  );
}
