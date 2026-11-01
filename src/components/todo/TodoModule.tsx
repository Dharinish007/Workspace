import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { TodoLanding } from './TodoLanding';
import { PageView } from './PageView';
import { ArchivedPagesModal } from './ArchivedPagesModal';

export const TodoModule: React.FC = () => {
  const { selectedPageId, setSelectedPageId } = useWorkspace();
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {selectedPageId ? (
        <PageView
          pageId={selectedPageId}
          onBackToOverview={() => setSelectedPageId(null)}
          onOpenArchived={() => setIsArchivedModalOpen(true)}
        />
      ) : (
        <TodoLanding onOpenPage={(id) => setSelectedPageId(id)} />
      )}

      <ArchivedPagesModal
        isOpen={isArchivedModalOpen}
        onClose={() => setIsArchivedModalOpen(false)}
      />
    </div>
  );
};

