
import { db } from '../db';
import { documentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Document } from '../schema';

export const getDocumentsByLead = async (leadId: number): Promise<Document[]> => {
  try {
    const results = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.lead_id, leadId))
      .execute();

    return results.map(document => ({
      ...document,
      // created_at is already a Date object from the database
    }));
  } catch (error) {
    console.error('Failed to get documents by lead:', error);
    throw error;
  }
};
