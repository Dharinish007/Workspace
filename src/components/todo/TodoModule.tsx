import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TodoLanding } from './TodoLanding';
import { PageView } from './PageView';
import { ArchivedPagesModal } from './ArchivedPagesModal';

export const TodoModule: React.FC = () => {
  const { pageId } = useParams<{ pageId?: string }>();
  const navigate = useNavigate();
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {pageId ? (
        <PageView
          pageId={pageId}
          onBackToOverview={() => navigate('/tasks')}
          onOpenArchived={() => setIsArchivedModalOpen(true)}
        />
      ) : (
        <TodoLanding 
          onOpenPage={(id) => navigate(`/pages/${id}`)} 
        />
      )}

      <ArchivedPagesModal
        isOpen={isArchivedModalOpen}
        onClose={() => setIsArchivedModalOpen(false)}
      />
    </div>
  );
};
