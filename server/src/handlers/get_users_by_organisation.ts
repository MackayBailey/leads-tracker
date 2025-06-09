
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type GetUsersByOrganisationInput, type User } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export const getUsersByOrganisation = async (input: GetUsersByOrganisationInput): Promise<User[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [
      eq(usersTable.organisation_id, input.organisation_id)
    ];

    // Add optional filters
    if (input.role !== undefined) {
      conditions.push(eq(usersTable.role, input.role));
    }

    if (input.is_active !== undefined) {
      conditions.push(eq(usersTable.is_active, input.is_active));
    }

    // Execute query with all conditions
    const results = await db.select()
      .from(usersTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();

    return results;
  } catch (error) {
    console.error('Get users by organisation failed:', error);
    throw error;
  }
};
