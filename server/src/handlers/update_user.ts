
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    const { id, ...updateData } = input;

    // Update user record
    const result = await db.update(usersTable)
      .set({
        ...updateData,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};
