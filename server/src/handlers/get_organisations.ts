
import { db } from '../db';
import { organisationsTable } from '../db/schema';
import { type Organisation } from '../schema';

export const getOrganisations = async (): Promise<Organisation[]> => {
  try {
    const results = await db.select()
      .from(organisationsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get organisations:', error);
    throw error;
  }
};
