
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organisationsTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput, type CreateOrganisationInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testOrganisationId: number;
  let testUserId: number;

  beforeEach(async () => {
    // Create test organisation directly
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'A test organisation',
      })
      .returning()
      .execute();
    testOrganisationId = orgResult[0].id;

    // Create test user directly
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'broker',
        organisation_id: testOrganisationId,
        is_active: true,
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;
  });

  it('should update user fields', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      first_name: 'Jane',
      last_name: 'Smith',
      role: 'admin',
      is_active: false,
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual(testUserId);
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.role).toEqual('admin');
    expect(result.is_active).toEqual(false);
    expect(result.email).toEqual('test@example.com'); // Unchanged
    expect(result.organisation_id).toEqual(testOrganisationId); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update user email', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      email: 'newemail@example.com',
    };

    const result = await updateUser(updateInput);

    expect(result.email).toEqual('newemail@example.com');
    expect(result.first_name).toEqual('John'); // Unchanged
    expect(result.last_name).toEqual('Doe'); // Unchanged
  });

  it('should save updated user to database', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      first_name: 'Updated Name',
      role: 'view_only',
    };

    await updateUser(updateInput);

    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].first_name).toEqual('Updated Name');
    expect(users[0].role).toEqual('view_only');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update organisation assignment', async () => {
    // Create second organisation directly
    const secondOrgResult = await db.insert(organisationsTable)
      .values({
        name: 'Second Organisation',
        description: 'Another test organisation',
      })
      .returning()
      .execute();

    const updateInput: UpdateUserInput = {
      id: testUserId,
      organisation_id: secondOrgResult[0].id,
    };

    const result = await updateUser(updateInput);

    expect(result.organisation_id).toEqual(secondOrgResult[0].id);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 99999,
      first_name: 'Non-existent',
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should handle partial updates', async () => {
    const updateInput: UpdateUserInput = {
      id: testUserId,
      is_active: false,
    };

    const result = await updateUser(updateInput);

    expect(result.is_active).toEqual(false);
    expect(result.first_name).toEqual('John'); // Unchanged
    expect(result.last_name).toEqual('Doe'); // Unchanged
    expect(result.email).toEqual('test@example.com'); // Unchanged
    expect(result.role).toEqual('broker'); // Unchanged
  });
});
