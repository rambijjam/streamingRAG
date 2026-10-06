import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Outlet, useLocation } from "react-router-dom";
import * as authApi from '../../services/authApi';
import Topbar from "./TopBar";
import ToastHost from "../common/ToastHost";
import { Sidebar } from "./SideBar";

const ROUTE_META = {
  '/chat': { title: 'Ask a question', crumb: 'Workspace / Chat' },
  '/history': { title: 'Chat history', crumb: 'Workspace / History' },
  '/admin': { title: 'Admin dashboard', crumb: 'Admin / Dashboard' },
  '/admin/documents': { title: 'Documents', crumb: 'Admin / Documents' },
  '/admin/gaps': { title: 'Feedback log', crumb: 'Admin / Feedback' },
  '/admin/access': { title: 'Document access', crumb: 'Admin / Access control' },
  '/admin/users': { title: 'User management', crumb: 'Admin / Users' },
};

export const AppLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [gapCount, setGapCount] = useState(0);
    const { user } = useAuth();
    const location = useLocation();

    // fetches the feedback score everytime location.pathname chagnes 
    useEffect(() => {
        if (user?.role === 'admin') {
        authApi.getFeedback()
            .then((logs) => setGapCount(logs.filter((g) => g.feedback_score < 0).length))
            .catch(() => setGapCount(0));
        }
    }, [user, location.pathname]);

    const meta = ROUTE_META[location.pathname] || { title: 'Know Gate', crumb: '' };

    return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} gapCount={gapCount} />
      <div className="app-main">
        <Topbar title={meta.title} crumb={meta.crumb} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        <div className="app-content">
          <Outlet />
        </div>
      </div>
      <ToastHost />
    </div>
  );
}