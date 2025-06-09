
import { db } from '../db';
import { leadsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteLead = async (id: number): Promise<void> => {
  try {
    await db.delete(leadsTable)
      .where(eq(leadsTable.id, id))
      .execute();
  } catch (error) {
    console.error('Lead deletion failed:', error);
    throw error;
  }
};
