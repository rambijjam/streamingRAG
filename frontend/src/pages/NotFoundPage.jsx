import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react'; 
import EmptyState from '../components/common/EmptyState';

export default function NotFoundPage() {
  return (
    <div style={{ paddingTop: 60 }}>
      <EmptyState
        icon={<FileQuestion size={48} strokeWidth={1.5} />} 
        title="Page not found"
        body="That page doesn't exist, or you don't have access to it."
        action={<Link to="/chat" className="btn btn-primary">Back to chat</Link>}
      />
    </div>
  );
}