
import { db } from '../db';
import { leadsTable } from '../db/schema';
import { type Lead } from '../schema';
import { eq } from 'drizzle-orm';

export const getLeadById = async (id: number): Promise<Lead | null> => {
  try {
    const results = await db.select()
      .from(leadsTable)
      .where(eq(leadsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const lead = results[0];
    return {
      ...lead,
      estimated_value: parseFloat(lead.estimated_value), // Convert numeric to number
      insurance_types: lead.insurance_types as any, // JSONB array
    };
  } catch (error) {
    console.error('Get lead by ID failed:', error);
    throw error;
  }
};
