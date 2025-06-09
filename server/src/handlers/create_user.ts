
import { db } from '../db';
import { usersTable, organisationsTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Verify organisation exists to prevent foreign key constraint violation
    const organisation = await db.select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, input.organisation_id))
      .execute();

    if (organisation.length === 0) {
      throw new Error(`Organisation with id ${input.organisation_id} not found`);
    }

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        role: input.role,
        organisation_id: input.organisation_id,
        is_active: true // Default value from schema
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};
