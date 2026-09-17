import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Job, Paged } from '../../types';
import { EmptyState, Pagination, Spinner } from '../../components/ui';
import { JobCard } from '../public/BrowseJobs';

export default function Bookmarks() {
  const [data, setData] = useState<Paged<Job> | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/bookmarks?page=${page}`).then((r) => setData(r.data.data)).finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold">Saved jobs</h1>
      {loading ? <Spinner /> : !data || data.results.length === 0 ? (
        <EmptyState title="No saved jobs" hint="Bookmark jobs while browsing to find them here." action={<Link to="/freelancer/jobs" className="btn-primary">Browse jobs</Link>} />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.results.map((j) => <JobCard key={j._id} job={j} linkPrefix="/freelancer/jobs" />)}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}
