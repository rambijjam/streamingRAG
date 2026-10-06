import { Menu } from "lucide-react";

export default function Topbar({ title, crumb, onToggleSidebar }) {
  return (
    <header className="topbar">
      <div className="flex items-center gap-3">

        {/* visible only  if view port width is <= 900px*/}
        <button className="btn btn-ghost btn-icon sidebar-toggle" onClick={onToggleSidebar} aria-label="Toggle menu">
          <Menu size={18} />
        </button> 
        
        <div>
          <div className="topbar-title">{title}</div>
          {crumb && <div className="topbar-crumb">{crumb}</div>}
        </div>
      </div>
    </header>
  );
}
