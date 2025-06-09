
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable, usersTable, leadsTable } from '../db/schema';
import { getLeadById } from '../handlers/get_lead_by_id';

describe('getLeadById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return lead by id', async () => {
    // Create test organisation
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test org description'
      })
      .returning()
      .execute();
    const organisationId = orgResult[0].id;

    // Create test user for broker assignment
    const userResult = await db.insert(usersTable)
      .values({
        email: 'broker@test.com',
        first_name: 'Test',
        last_name: 'Broker',
        role: 'broker',
        organisation_id: organisationId
      })
      .returning()
      .execute();
    const brokerId = userResult[0].id;

    // Create test lead
    const leadResult = await db.insert(leadsTable)
      .values({
        name: 'Test Lead',
        email: 'lead@test.com',
        phone: '+1234567890',
        insurance_types: JSON.stringify(['life', 'health']),
        status: 'new',
        source: 'website',
        estimated_value: '5000.50',
        notes: 'Test notes',
        organisation_id: organisationId,
        assigned_broker_id: brokerId
      })
      .returning()
      .execute();
    const leadId = leadResult[0].id;

    const result = await getLeadById(leadId);

    expect(result).toBeDefined();
    expect(result!.id).toBe(leadId);
    expect(result!.name).toBe('Test Lead');
    expect(result!.email).toBe('lead@test.com');
    expect(result!.phone).toBe('+1234567890');
    expect(result!.insurance_types).toEqual(['life', 'health']);
    expect(result!.status).toBe('new');
    expect(result!.source).toBe('website');
    expect(result!.estimated_value).toBe(5000.50);
    expect(typeof result!.estimated_value).toBe('number');
    expect(result!.notes).toBe('Test notes');
    expect(result!.organisation_id).toBe(organisationId);
    expect(result!.assigned_broker_id).toBe(brokerId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent lead', async () => {
    const result = await getLeadById(99999);
    expect(result).toBeNull();
  });

  it('should handle lead with minimal data', async () => {
    // Create test organisation
    const orgResult = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: null
      })
      .returning()
      .execute();
    const organisationId = orgResult[0].id;

    // Create minimal lead
    const leadResult = await db.insert(leadsTable)
      .values({
        name: 'Minimal Lead',
        email: null,
        phone: null,
        insurance_types: JSON.stringify(['auto']),
        source: 'referral',
        organisation_id: organisationId,
        assigned_broker_id: null,
        notes: null,
        due_date: null,
        parent_lead_id: null
      })
      .returning()
      .execute();
    const leadId = leadResult[0].id;

    const result = await getLeadById(leadId);

    expect(result).toBeDefined();
    expect(result!.id).toBe(leadId);
    expect(result!.name).toBe('Minimal Lead');
    expect(result!.email).toBeNull();
    expect(result!.phone).toBeNull();
    expect(result!.insurance_types).toEqual(['auto']);
    expect(result!.status).toBe('new'); // Default value
    expect(result!.estimated_value).toBe(0); // Default value converted to number
    expect(result!.assigned_broker_id).toBeNull();
    expect(result!.notes).toBeNull();
    expect(result!.due_date).toBeNull();
    expect(result!.parent_lead_id).toBeNull();
  });
});
