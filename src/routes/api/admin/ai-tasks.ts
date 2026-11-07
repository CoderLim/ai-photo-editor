import { createFileRoute } from '@tanstack/react-router';
import { runAdminRoute } from '@/server/admin/execute';

export const Route = createFileRoute('/api/admin/ai-tasks')({
  server: {
    handlers: {
      GET: (context) => runAdminRoute('ai_tasks_list', context),
    },
  },
});
