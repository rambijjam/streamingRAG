import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom"
import { AuthProvider, useAuth } from "./context/authContext"
import { ToastProvider } from "./context/toastContext"
import { AppLayout } from "./components/layout/AppLayout";
import ProtectedRoute from "./components/common/ProtectedRoute";

import { Login } from "./pages/Login";
import ChatPage from "./pages/chatPage";
import HistoryPage from "./pages/historyPage";
import AdminDashboard from "./pages/AdminDashboard";

import DocumentsPanel from "./components/admin/DocumentsPanel";
import KnowledgeGapInbox from "./components/admin/KnowledgeGapInbox";
import DocumentAccessPanel from "./components/admin/DocumentAccessPanel";
import UserManagementPanel from "./components/admin/UserManagementPanel";
import NotFoundPage from "./pages/NotFoundPage";

const RootRedirect = ()=>{
    const {user} = useAuth();

    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to={user.role === 'admin' ? '/admin' : '/chat'} replace />;
}

export default function App() {
    return(
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<RootRedirect />} />
                        <Route path="/login" element={<Login />} />
                        
                        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                            <Route path="/chat" element={<ChatPage />} />
                            <Route path="/history" element={<HistoryPage />} />
                            
                            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                            <Route path="/admin/documents" element={<ProtectedRoute roles={['admin']}><DocumentsPanel /></ProtectedRoute>} />
                            <Route path="/admin/gaps" element={<ProtectedRoute roles={['admin']}><KnowledgeGapInbox /></ProtectedRoute>} />
                            <Route path="/admin/access" element={<ProtectedRoute roles={['admin']}><DocumentAccessPanel /></ProtectedRoute>} />
                            <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><UserManagementPanel /></ProtectedRoute>} />

                        </Route>

                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </BrowserRouter>
            </ToastProvider>
        </AuthProvider>
    );
}