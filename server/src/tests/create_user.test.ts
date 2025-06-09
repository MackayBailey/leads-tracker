
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organisationsTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create test organisation
  const createTestOrganisation = async () => {
    const result = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'A test organisation'
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should create a user with valid organisation', async () => {
    // Create prerequisite organisation
    const organisation = await createTestOrganisation();

    const testInput: CreateUserInput = {
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'broker',
      organisation_id: organisation.id
    };

    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('broker');
    expect(result.organisation_id).toEqual(organisation.id);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    // Create prerequisite organisation
    const organisation = await createTestOrganisation();

    const testInput: CreateUserInput = {
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'admin',
      organisation_id: organisation.id
    };

    const result = await createUser(testInput);

    // Query user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].role).toEqual('admin');
    expect(users[0].organisation_id).toEqual(organisation.id);
    expect(users[0].is_active).toBe(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent organisation', async () => {
    const testInput: CreateUserInput = {
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'view_only',
      organisation_id: 9999 // Non-existent organisation
    };

    await expect(createUser(testInput)).rejects.toThrow(/organisation.*not found/i);
  });

  it('should create users with different roles', async () => {
    // Create prerequisite organisation
    const organisation = await createTestOrganisation();

    const adminInput: CreateUserInput = {
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'admin',
      organisation_id: organisation.id
    };

    const brokerInput: CreateUserInput = {
      email: 'broker@example.com',
      first_name: 'Broker',
      last_name: 'User',
      role: 'broker',
      organisation_id: organisation.id
    };

    const viewOnlyInput: CreateUserInput = {
      email: 'viewer@example.com',
      first_name: 'View',
      last_name: 'User',
      role: 'view_only',
      organisation_id: organisation.id
    };

    const adminResult = await createUser(adminInput);
    const brokerResult = await createUser(brokerInput);
    const viewOnlyResult = await createUser(viewOnlyInput);

    expect(adminResult.role).toEqual('admin');
    expect(brokerResult.role).toEqual('broker');
    expect(viewOnlyResult.role).toEqual('view_only');

    // Verify all users are in database
    const allUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.organisation_id, organisation.id))
      .execute();

    expect(allUsers).toHaveLength(3);
  });
});
