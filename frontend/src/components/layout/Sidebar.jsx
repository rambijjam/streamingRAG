import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { displayNameFromEmail, initialsFromEmail } from "../../utils/userDisplay";
import {
  ChartNoAxesColumnIncreasing,
  User2,
  CircleIcon,
  FileTextIcon,
  HouseIcon,
  DiamondIcon,
  RefreshCcw,
} from "lucide-react";

export const Sidebar = ({ open, onNavigate, gapCount })=>{
    const { user, signOut } = useAuth();
    if (!user) return null;

    const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

    return (
        <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
            <div className="brand-mark">KG</div>
            <div>
            <div className="brand-name">KNOW GATE</div>
            <div className="brand-sub">KNOWLEDGE CONSOLE</div>
            </div>
        </div>

        <nav className="sidebar-nav">
            <div className="nav-group-label">Workspace</div>
            <NavLink to="/chat" className={linkClass} onClick={onNavigate}>
                <span className="nav-icon"><DiamondIcon size={18}/></span> <span>Ask a question</span>
            </NavLink>
            <NavLink to="/history" className={linkClass} onClick={onNavigate}>
                <span className="nav-icon"><RefreshCcw size={18}/></span> <span>Chat history</span>
            </NavLink>

            {user.role === 'admin' && (
            <>
                <div className="nav-group-label">Admin</div>
                <NavLink to="/admin" end className={linkClass} onClick={onNavigate}>
                    <span className="nav-icon"><HouseIcon size={18}/></span> <span>Dashboard</span>
                </NavLink>

                <NavLink to="/admin/documents" className={linkClass} onClick={onNavigate}>
                    <span className="nav-icon"><FileTextIcon size={18}/></span> <span>Documents</span>
                </NavLink>

                <NavLink to="/admin/gaps" className={linkClass} onClick={onNavigate}>
                    <span className="nav-icon"><CircleIcon size={18}/></span> <span>Feedback log</span>
                    {gapCount > 0 && <span className="nav-badge">{gapCount}</span>}
                </NavLink>

                <NavLink to="/admin/access" className={linkClass} onClick={onNavigate}>
                    <span className="nav-icon"><ChartNoAxesColumnIncreasing size={18}/></span> <span>Document access</span>
                </NavLink>
                
                <NavLink to="/admin/users" className={linkClass} onClick={onNavigate}>
                    <span className="nav-icon"><User2 size={18}/></span> <span>User management</span>
                </NavLink>
            </>
            )}
        </nav>

        <div className="sidebar-footer">
            <div className="user-card">
                <div className="avatar">{initialsFromEmail(user.email)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="user-card-name truncate">{displayNameFromEmail(user.email)}</div>
                    <div className="user-card-role">{user.role}</div>
                </div>
                <button className="btn btn-ghost btn-icon" title="Sign out" onClick={signOut} aria-label="Sign out">⏻</button>
            </div>
        </div>
        </aside>
    );
}