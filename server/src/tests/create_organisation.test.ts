
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable } from '../db/schema';
import { type CreateOrganisationInput } from '../schema';
import { createOrganisation } from '../handlers/create_organisation';
import { eq } from 'drizzle-orm';

const testInput: CreateOrganisationInput = {
  name: 'Test Insurance Company',
  description: 'A company for testing purposes',
};

const testInputWithNullDescription: CreateOrganisationInput = {
  name: 'Another Test Company',
  description: null,
};

describe('createOrganisation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an organisation with description', async () => {
    const result = await createOrganisation(testInput);

    expect(result.name).toEqual('Test Insurance Company');
    expect(result.description).toEqual('A company for testing purposes');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an organisation with null description', async () => {
    const result = await createOrganisation(testInputWithNullDescription);

    expect(result.name).toEqual('Another Test Company');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save organisation to database', async () => {
    const result = await createOrganisation(testInput);

    const organisations = await db.select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, result.id))
      .execute();

    expect(organisations).toHaveLength(1);
    expect(organisations[0].name).toEqual('Test Insurance Company');
    expect(organisations[0].description).toEqual('A company for testing purposes');
    expect(organisations[0].created_at).toBeInstanceOf(Date);
    expect(organisations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle empty string description as null', async () => {
    const inputWithEmptyDescription: CreateOrganisationInput = {
      name: 'Empty Description Company',
      description: '',
    };

    const result = await createOrganisation(inputWithEmptyDescription);

    expect(result.name).toEqual('Empty Description Company');
    expect(result.description).toEqual('');
    expect(result.id).toBeDefined();
  });
});
