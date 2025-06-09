
import { db } from '../db';
import { leadsTable } from '../db/schema';
import { type CreateLeadInput, type Lead } from '../schema';

export const createLead = async (input: CreateLeadInput): Promise<Lead> => {
  try {
    // Insert lead record
    const result = await db.insert(leadsTable)
      .values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        insurance_types: input.insurance_types, // JSONB column - no conversion needed
        source: input.source,
        estimated_value: input.estimated_value.toString(), // Convert number to string for numeric column
        notes: input.notes,
        due_date: input.due_date,
        organisation_id: input.organisation_id,
        assigned_broker_id: input.assigned_broker_id,
        parent_lead_id: input.parent_lead_id
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const lead = result[0];
    return {
      ...lead,
      estimated_value: parseFloat(lead.estimated_value), // Convert string back to number
      insurance_types: lead.insurance_types as any[] // Type assertion for JSONB array
    };
  } catch (error) {
    console.error('Lead creation failed:', error);
    throw error;
  }
};
