
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable } from '../db/schema';
import { getOrganisations } from '../handlers/get_organisations';

describe('getOrganisations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no organisations exist', async () => {
    const result = await getOrganisations();
    expect(result).toEqual([]);
  });

  it('should return all organisations', async () => {
    // Create test organisations
    await db.insert(organisationsTable)
      .values([
        {
          name: 'Test Org 1',
          description: 'First test organisation'
        },
        {
          name: 'Test Org 2',
          description: null
        },
        {
          name: 'Test Org 3',
          description: 'Third test organisation'
        }
      ])
      .execute();

    const result = await getOrganisations();

    expect(result).toHaveLength(3);
    
    // Verify first organisation
    expect(result[0].name).toEqual('Test Org 1');
    expect(result[0].description).toEqual('First test organisation');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Verify second organisation with null description
    expect(result[1].name).toEqual('Test Org 2');
    expect(result[1].description).toBeNull();
    expect(result[1].id).toBeDefined();

    // Verify third organisation
    expect(result[2].name).toEqual('Test Org 3');
    expect(result[2].description).toEqual('Third test organisation');
    expect(result[2].id).toBeDefined();
  });

  it('should return organisations in insertion order', async () => {
    // Create organisations in specific order
    const firstOrg = await db.insert(organisationsTable)
      .values({
        name: 'First Organisation',
        description: 'Created first'
      })
      .returning()
      .execute();

    const secondOrg = await db.insert(organisationsTable)
      .values({
        name: 'Second Organisation',
        description: 'Created second'
      })
      .returning()
      .execute();

    const result = await getOrganisations();

    expect(result).toHaveLength(2);
    expect(result[0].id).toEqual(firstOrg[0].id);
    expect(result[0].name).toEqual('First Organisation');
    expect(result[1].id).toEqual(secondOrg[0].id);
    expect(result[1].name).toEqual('Second Organisation');
  });
});
