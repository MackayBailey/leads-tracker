
import { db } from '../db';
import { leadsTable } from '../db/schema';
import { type Lead } from '../schema';
import { eq, lte, and } from 'drizzle-orm';

export const getDueLeads = async (organisationId: number): Promise<Lead[]> => {
  try {
    const now = new Date();
    
    const results = await db.select()
      .from(leadsTable)
      .where(
        and(
          eq(leadsTable.organisation_id, organisationId),
          lte(leadsTable.due_date, now)
        )
      )
      .execute();

    return results.map(lead => ({
      ...lead,
      estimated_value: parseFloat(lead.estimated_value), // Convert numeric to number
      insurance_types: lead.insurance_types as any[] // Cast JSONB array
    }));
  } catch (error) {
    console.error('Get due leads failed:', error);
    throw error;
  }
};
