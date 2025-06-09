
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable } from '../db/schema';
import { type CreateOrganisationInput, type UpdateOrganisationInput } from '../schema';
import { updateOrganisation } from '../handlers/update_organisation';
import { eq } from 'drizzle-orm';

// Helper to create an organisation for testing
const createTestOrganisation = async (data: CreateOrganisationInput) => {
  const result = await db.insert(organisationsTable)
    .values({
      name: data.name,
      description: data.description,
    })
    .returning()
    .execute();
  return result[0];
};

describe('updateOrganisation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update organisation name', async () => {
    // Create test organisation
    const testOrg = await createTestOrganisation({
      name: 'Original Name',
      description: 'Original description',
    });

    const updateInput: UpdateOrganisationInput = {
      id: testOrg.id,
      name: 'Updated Name',
    };

    const result = await updateOrganisation(updateInput);

    expect(result.id).toEqual(testOrg.id);
    expect(result.name).toEqual('Updated Name');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testOrg.updated_at.getTime());
  });

  it('should update organisation description', async () => {
    const testOrg = await createTestOrganisation({
      name: 'Test Org',
      description: 'Original description',
    });

    const updateInput: UpdateOrganisationInput = {
      id: testOrg.id,
      description: 'Updated description',
    };

    const result = await updateOrganisation(updateInput);

    expect(result.id).toEqual(testOrg.id);
    expect(result.name).toEqual('Test Org'); // Should remain unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields', async () => {
    const testOrg = await createTestOrganisation({
      name: 'Original Name',
      description: 'Original description',
    });

    const updateInput: UpdateOrganisationInput = {
      id: testOrg.id,
      name: 'New Name',
      description: 'New description',
    };

    const result = await updateOrganisation(updateInput);

    expect(result.id).toEqual(testOrg.id);
    expect(result.name).toEqual('New Name');
    expect(result.description).toEqual('New description');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null description update', async () => {
    const testOrg = await createTestOrganisation({
      name: 'Test Org',
      description: 'Has description',
    });

    const updateInput: UpdateOrganisationInput = {
      id: testOrg.id,
      description: null,
    };

    const result = await updateOrganisation(updateInput);

    expect(result.id).toEqual(testOrg.id);
    expect(result.name).toEqual('Test Org');
    expect(result.description).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const testOrg = await createTestOrganisation({
      name: 'Original Name',
      description: 'Original description',
    });

    const updateInput: UpdateOrganisationInput = {
      id: testOrg.id,
      name: 'Database Updated Name',
    };

    await updateOrganisation(updateInput);

    // Verify changes were persisted
    const organisations = await db.select()
      .from(organisationsTable)
      .where(eq(organisationsTable.id, testOrg.id))
      .execute();

    expect(organisations).toHaveLength(1);
    expect(organisations[0].name).toEqual('Database Updated Name');
    expect(organisations[0].description).toEqual('Original description');
    expect(organisations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent organisation', async () => {
    const updateInput: UpdateOrganisationInput = {
      id: 999999,
      name: 'New Name',
    };

    expect(updateOrganisation(updateInput)).rejects.toThrow(/organisation not found/i);
  });

  it('should update only updated_at when no other fields provided', async () => {
    const testOrg = await createTestOrganisation({
      name: 'Test Org',
      description: 'Test description',
    });

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1));

    const updateInput: UpdateOrganisationInput = {
      id: testOrg.id,
    };

    const result = await updateOrganisation(updateInput);

    expect(result.id).toEqual(testOrg.id);
    expect(result.name).toEqual('Test Org');
    expect(result.description).toEqual('Test description');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testOrg.updated_at.getTime());
  });
});
