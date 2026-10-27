import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/Ui';

export default function NotFound() {
  return (
    <EmptyState icon={Compass} title="This page isn’t on the shelf" action={<Link className="btn btn-primary" to="/catalog">Go to the catalog</Link>}>
      The link may be out of date, or the page may have moved.
    </EmptyState>
  );
}
