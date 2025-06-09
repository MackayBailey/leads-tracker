
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteDocument = async (id: number): Promise<void> => {
  try {
    await db.delete(documentsTable)
      .where(eq(documentsTable.id, id))
      .execute();
  } catch (error) {
    console.error('Document deletion failed:', error);
    throw error;
  }
};
