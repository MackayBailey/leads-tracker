
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable, usersTable, leadsTable } from '../db/schema';
import { type CreateOrganisationInput, type CreateUserInput, type CreateLeadInput } from '../schema';
import { getDueLeads } from '../handlers/get_due_leads';

describe('getDueLeads', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return leads that are due or overdue', async () => {
    // Create test organization
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Org',
        description: 'Test organization'
      })
      .returning()
      .execute();
    const orgId = orgResult[0].id;

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'broker@test.com',
        first_name: 'Test',
        last_name: 'Broker',
        role: 'broker',
        organisation_id: orgId
      })
      .returning()
      .execute();
    const brokerId = userResult[0].id;

    // Create leads with different due dates
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const now = new Date();

    // Due yesterday (overdue)
    await db.insert(leadsTable)
      .values({
        name: 'Overdue Lead',
        email: 'overdue@test.com',
        phone: '123-456-7890',
        insurance_types: JSON.stringify(['life']),
        source: 'referral',
        estimated_value: '1000.00',
        due_date: yesterday,
        organisation_id: orgId,
        assigned_broker_id: brokerId
      })
      .execute();

    // Due now (due today)
    await db.insert(leadsTable)
      .values({
        name: 'Due Today Lead',
        email: 'today@test.com',
        phone: '123-456-7891',
        insurance_types: JSON.stringify(['auto']),
        source: 'website',
        estimated_value: '2000.00',
        due_date: now,
        organisation_id: orgId,
        assigned_broker_id: brokerId
      })
      .execute();

    // Due tomorrow (not due yet)
    await db.insert(leadsTable)
      .values({
        name: 'Future Lead',
        email: 'future@test.com',
        phone: '123-456-7892',
        insurance_types: JSON.stringify(['health']),
        source: 'cold_call',
        estimated_value: '3000.00',
        due_date: tomorrow,
        organisation_id: orgId,
        assigned_broker_id: brokerId
      })
      .execute();

    // No due date
    await db.insert(leadsTable)
      .values({
        name: 'No Date Lead',
        email: 'nodate@test.com',
        phone: '123-456-7893',
        insurance_types: JSON.stringify(['home']),
        source: 'social_media',
        estimated_value: '500.00',
        organisation_id: orgId,
        assigned_broker_id: brokerId
      })
      .execute();

    const results = await getDueLeads(orgId);

    // Should return only the overdue and due today leads
    expect(results).toHaveLength(2);
    
    const leadNames = results.map(lead => lead.name).sort();
    expect(leadNames).toEqual(['Due Today Lead', 'Overdue Lead']);

    // Verify numeric conversion
    results.forEach(lead => {
      expect(typeof lead.estimated_value).toBe('number');
      expect(lead.estimated_value).toBeGreaterThan(0);
    });

    // Verify insurance types array
    results.forEach(lead => {
      expect(Array.isArray(lead.insurance_types)).toBe(true);
      expect(lead.insurance_types.length).toBeGreaterThan(0);
    });
  });

  it('should return empty array when no leads are due', async () => {
    // Create test organization
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Org',
        description: 'Test organization'
      })
      .returning()
      .execute();
    const orgId = orgResult[0].id;

    // Create lead due in the future
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(leadsTable)
      .values({
        name: 'Future Lead',
        email: 'future@test.com',
        insurance_types: JSON.stringify(['life']),
        source: 'referral',
        estimated_value: '1000.00',
        due_date: tomorrow,
        organisation_id: orgId
      })
      .execute();

    const results = await getDueLeads(orgId);

    expect(results).toHaveLength(0);
  });

  it('should only return leads for the specified organisation', async () => {
    // Create two organizations
    const org1Result = await db.insert(organisationsTable)
      .values({
        name: 'Org 1',
        description: 'First organization'
      })
      .returning()
      .execute();
    const org1Id = org1Result[0].id;

    const org2Result = await db.insert(organisationsTable)
      .values({
        name: 'Org 2',
        description: 'Second organization'
      })
      .returning()
      .execute();
    const org2Id = org2Result[0].id;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Create due lead for org 1
    await db.insert(leadsTable)
      .values({
        name: 'Org 1 Lead',
        email: 'org1@test.com',
        insurance_types: JSON.stringify(['life']),
        source: 'referral',
        estimated_value: '1000.00',
        due_date: yesterday,
        organisation_id: org1Id
      })
      .execute();

    // Create due lead for org 2
    await db.insert(leadsTable)
      .values({
        name: 'Org 2 Lead',
        email: 'org2@test.com',
        insurance_types: JSON.stringify(['auto']),
        source: 'website',
        estimated_value: '2000.00',
        due_date: yesterday,
        organisation_id: org2Id
      })
      .execute();

    const results = await getDueLeads(org1Id);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Org 1 Lead');
    expect(results[0].organisation_id).toBe(org1Id);
  });
});
