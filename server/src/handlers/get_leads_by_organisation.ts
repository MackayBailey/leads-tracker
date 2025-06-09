
import { db } from '../db';
import { leadsTable } from '../db/schema';
import { type GetLeadsByOrganisationInput, type Lead, type InsuranceType } from '../schema';
import { eq, and, SQL, isNull } from 'drizzle-orm';

export const getLeadsByOrganisation = async (input: GetLeadsByOrganisationInput): Promise<Lead[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(leadsTable.organisation_id, input.organisation_id)
    ];

    // Add optional filters
    if (input.status !== undefined) {
      conditions.push(eq(leadsTable.status, input.status));
    }

    if (input.assigned_broker_id !== undefined) {
      if (input.assigned_broker_id === null) {
        conditions.push(isNull(leadsTable.assigned_broker_id));
      } else {
        conditions.push(eq(leadsTable.assigned_broker_id, input.assigned_broker_id));
      }
    }

    // Build the complete query
    const results = await db.select()
      .from(leadsTable)
      .where(and(...conditions))
      .limit(input.limit)
      .offset(input.offset)
      .execute();

    // Convert numeric fields and parse JSON arrays
    return results.map(lead => ({
      ...lead,
      estimated_value: parseFloat(lead.estimated_value),
      insurance_types: lead.insurance_types as InsuranceType[], // Cast JSONB to InsuranceType array
    }));
  } catch (error) {
    console.error('Failed to get leads by organisation:', error);
    throw error;
  }
};
