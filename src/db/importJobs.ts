import { v4 as uuidv4 } from "uuid";

import { db, type ImportJob } from "./index";

const nowIso = () => new Date().toISOString();

export const createImportJob = async (
  totalCount: number,
): Promise<ImportJob> => {
  const job: ImportJob = {
    id: uuidv4(),
    status: "pending",
    total_count: totalCount,
    completed_count: 0,
    failed_count: 0,
    started_at: nowIso(),
  };

  await db.import_jobs.add(job);
  return job;
};
