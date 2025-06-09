
import { db } from '../db';
import { organisationsTable } from '../db/schema';
import { type UpdateOrganisationInput, type Organisation } from '../schema';
import { eq } from 'drizzle-orm';

export const updateOrganisation = async (input: UpdateOrganisationInput): Promise<Organisation> => {
  try {
    const { id, ...updateData } = input;

    // Build update object with only provided fields
    const updates: any = {};
    if (updateData.name !== undefined) {
      updates.name = updateData.name;
    }
    if (updateData.description !== undefined) {
      updates.description = updateData.description;
    }

    // Always update the updated_at timestamp
    updates.updated_at = new Date();

    const result = await db.update(organisationsTable)
      .set(updates)
      .where(eq(organisationsTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Organisation not found');
    }

    return result[0];
  } catch (error) {
    console.error('Organisation update failed:', error);
    throw error;
  }
};
