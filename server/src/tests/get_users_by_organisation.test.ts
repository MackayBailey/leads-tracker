
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable, usersTable } from '../db/schema';
import { type GetUsersByOrganisationInput } from '../schema';
import { getUsersByOrganisation } from '../handlers/get_users_by_organisation';

describe('getUsersByOrganisation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all users for an organisation', async () => {
    // Create test organisation
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Org',
        description: 'Test organisation'
      })
      .returning()
      .execute();

    const organisationId = orgResult[0].id;

    // Create test users
    await db.insert(usersTable)
      .values([
        {
          email: 'admin@test.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          organisation_id: organisationId,
          is_active: true
        },
        {
          email: 'broker@test.com',
          first_name: 'Broker',
          last_name: 'User',
          role: 'broker',
          organisation_id: organisationId,
          is_active: true
        }
      ])
      .execute();

    const input: GetUsersByOrganisationInput = {
      organisation_id: organisationId
    };

    const result = await getUsersByOrganisation(input);

    expect(result).toHaveLength(2);
    expect(result[0].organisation_id).toEqual(organisationId);
    expect(result[1].organisation_id).toEqual(organisationId);
    expect(result.some(u => u.role === 'admin')).toBe(true);
    expect(result.some(u => u.role === 'broker')).toBe(true);
  });

  it('should filter users by role', async () => {
    // Create test organisation
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Org',
        description: 'Test organisation'
      })
      .returning()
      .execute();

    const organisationId = orgResult[0].id;

    // Create users with different roles
    await db.insert(usersTable)
      .values([
        {
          email: 'admin@test.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'admin',
          organisation_id: organisationId,
          is_active: true
        },
        {
          email: 'broker@test.com',
          first_name: 'Broker',
          last_name: 'User',
          role: 'broker',
          organisation_id: organisationId,
          is_active: true
        },
        {
          email: 'viewer@test.com',
          first_name: 'View',
          last_name: 'User',
          role: 'view_only',
          organisation_id: organisationId,
          is_active: true
        }
      ])
      .execute();

    const input: GetUsersByOrganisationInput = {
      organisation_id: organisationId,
      role: 'broker'
    };

    const result = await getUsersByOrganisation(input);

    expect(result).toHaveLength(1);
    expect(result[0].role).toEqual('broker');
    expect(result[0].email).toEqual('broker@test.com');
  });

  it('should filter users by active status', async () => {
    // Create test organisation
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Org',
        description: 'Test organisation'
      })
      .returning()
      .execute();

    const organisationId = orgResult[0].id;

    // Create users with different active status
    await db.insert(usersTable)
      .values([
        {
          email: 'active@test.com',
          first_name: 'Active',
          last_name: 'User',
          role: 'broker',
          organisation_id: organisationId,
          is_active: true
        },
        {
          email: 'inactive@test.com',
          first_name: 'Inactive',
          last_name: 'User',
          role: 'broker',
          organisation_id: organisationId,
          is_active: false
        }
      ])
      .execute();

    const input: GetUsersByOrganisationInput = {
      organisation_id: organisationId,
      is_active: false
    };

    const result = await getUsersByOrganisation(input);

    expect(result).toHaveLength(1);
    expect(result[0].is_active).toBe(false);
    expect(result[0].email).toEqual('inactive@test.com');
  });

  it('should filter by both role and active status', async () => {
    // Create test organisation
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Org',
        description: 'Test organisation'
      })
      .returning()
      .execute();

    const organisationId = orgResult[0].id;

    // Create various users
    await db.insert(usersTable)
      .values([
        {
          email: 'active-admin@test.com',
          first_name: 'Active',
          last_name: 'Admin',
          role: 'admin',
          organisation_id: organisationId,
          is_active: true
        },
        {
          email: 'inactive-admin@test.com',
          first_name: 'Inactive',
          last_name: 'Admin',
          role: 'admin',
          organisation_id: organisationId,
          is_active: false
        },
        {
          email: 'active-broker@test.com',
          first_name: 'Active',
          last_name: 'Broker',
          role: 'broker',
          organisation_id: organisationId,
          is_active: true
        }
      ])
      .execute();

    const input: GetUsersByOrganisationInput = {
      organisation_id: organisationId,
      role: 'admin',
      is_active: false
    };

    const result = await getUsersByOrganisation(input);

    expect(result).toHaveLength(1);
    expect(result[0].role).toEqual('admin');
    expect(result[0].is_active).toBe(false);
    expect(result[0].email).toEqual('inactive-admin@test.com');
  });

  it('should return empty array when no users match', async () => {
    // Create test organisation
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Org',
        description: 'Test organisation'
      })
      .returning()
      .execute();

    const organisationId = orgResult[0].id;

    const input: GetUsersByOrganisationInput = {
      organisation_id: organisationId
    };

    const result = await getUsersByOrganisation(input);

    expect(result).toHaveLength(0);
  });

  it('should not return users from different organisations', async () => {
    // Create two organisations
    const org1Result = await db.insert(organisationsTable)
      .values({
        name: 'Org 1',
        description: 'First organisation'
      })
      .returning()
      .execute();

    const org2Result = await db.insert(organisationsTable)
      .values({
        name: 'Org 2',
        description: 'Second organisation'
      })
      .returning()
      .execute();

    const org1Id = org1Result[0].id;
    const org2Id = org2Result[0].id;

    // Create users in both organisations
    await db.insert(usersTable)
      .values([
        {
          email: 'user1@org1.com',
          first_name: 'User',
          last_name: 'One',
          role: 'broker',
          organisation_id: org1Id,
          is_active: true
        },
        {
          email: 'user2@org2.com',
          first_name: 'User',
          last_name: 'Two',
          role: 'broker',
          organisation_id: org2Id,
          is_active: true
        }
      ])
      .execute();

    const input: GetUsersByOrganisationInput = {
      organisation_id: org1Id
    };

    const result = await getUsersByOrganisation(input);

    expect(result).toHaveLength(1);
    expect(result[0].organisation_id).toEqual(org1Id);
    expect(result[0].email).toEqual('user1@org1.com');
  });
});
