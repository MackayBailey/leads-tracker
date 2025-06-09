
import { db } from '../db';
import { organisationsTable } from '../db/schema';
import { type CreateOrganisationInput, type Organisation } from '../schema';

export const createOrganisation = async (input: CreateOrganisationInput): Promise<Organisation> => {
  try {
    const result = await db.insert(organisationsTable)
      .values({
        name: input.name,
        description: input.description,
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Organisation creation failed:', error);
    throw error;
  }
};
