
import { db } from '../db';
import { leadsTable } from '../db/schema';
import { type UpdateLeadInput, type Lead } from '../schema';
import { eq } from 'drizzle-orm';

export const updateLead = async (input: UpdateLeadInput): Promise<Lead> => {
  try {
    // Prepare update values, converting numeric fields
    const updateValues: any = {};
    
    if (input.name !== undefined) updateValues.name = input.name;
    if (input.email !== undefined) updateValues.email = input.email;
    if (input.phone !== undefined) updateValues.phone = input.phone;
    if (input.insurance_types !== undefined) updateValues.insurance_types = input.insurance_types;
    if (input.status !== undefined) updateValues.status = input.status;
    if (input.source !== undefined) updateValues.source = input.source;
    if (input.estimated_value !== undefined) updateValues.estimated_value = input.estimated_value.toString();
    if (input.notes !== undefined) updateValues.notes = input.notes;
    if (input.due_date !== undefined) updateValues.due_date = input.due_date;
    if (input.assigned_broker_id !== undefined) updateValues.assigned_broker_id = input.assigned_broker_id;
    if (input.parent_lead_id !== undefined) updateValues.parent_lead_id = input.parent_lead_id;
    
    // Add updated_at timestamp
    updateValues.updated_at = new Date();

    // Update lead record
    const result = await db.update(leadsTable)
      .set(updateValues)
      .where(eq(leadsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Lead with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const lead = result[0];
    return {
      ...lead,
      estimated_value: parseFloat(lead.estimated_value),
      insurance_types: lead.insurance_types as any
    };
  } catch (error) {
    console.error('Lead update failed:', error);
    throw error;
  }
};
