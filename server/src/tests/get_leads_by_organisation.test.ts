
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable, usersTable, leadsTable } from '../db/schema';
import { type GetLeadsByOrganisationInput } from '../schema';
import { getLeadsByOrganisation } from '../handlers/get_leads_by_organisation';

describe('getLeadsByOrganisation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get leads by organisation', async () => {
    // Create organisation
    const [org] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test description'
      })
      .returning()
      .execute();

    // Create leads
    await db.insert(leadsTable)
      .values([
        {
          name: 'Lead 1',
          email: 'lead1@test.com',
          phone: '1234567890',
          insurance_types: JSON.stringify(['life', 'auto']),
          status: 'new',
          source: 'website',
          estimated_value: '1000.00',
          organisation_id: org.id,
        },
        {
          name: 'Lead 2',
          email: 'lead2@test.com',
          phone: '0987654321',
          insurance_types: JSON.stringify(['health']),
          status: 'contacted',
          source: 'referral',
          estimated_value: '2500.50',
          organisation_id: org.id,
        }
      ])
      .execute();

    const input: GetLeadsByOrganisationInput = {
      organisation_id: org.id,
      limit: 50,
      offset: 0,
    };

    const results = await getLeadsByOrganisation(input);

    expect(results).toHaveLength(2);
    expect(results[0].name).toEqual('Lead 1');
    expect(results[0].organisation_id).toEqual(org.id);
    expect(results[0].estimated_value).toEqual(1000.00);
    expect(typeof results[0].estimated_value).toBe('number');
    expect(results[0].insurance_types).toEqual(['life', 'auto']);
    expect(results[1].name).toEqual('Lead 2');
    expect(results[1].estimated_value).toEqual(2500.50);
    expect(results[1].insurance_types).toEqual(['health']);
  });

  it('should filter by status', async () => {
    // Create organisation
    const [org] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test description'
      })
      .returning()
      .execute();

    // Create leads with different statuses
    await db.insert(leadsTable)
      .values([
        {
          name: 'New Lead',
          insurance_types: JSON.stringify(['life']),
          status: 'new',
          source: 'website',
          estimated_value: '1000.00',
          organisation_id: org.id,
        },
        {
          name: 'Contacted Lead',
          insurance_types: JSON.stringify(['auto']),
          status: 'contacted',
          source: 'referral',
          estimated_value: '2000.00',
          organisation_id: org.id,
        }
      ])
      .execute();

    const input: GetLeadsByOrganisationInput = {
      organisation_id: org.id,
      status: 'new',
      limit: 50,
      offset: 0,
    };

    const results = await getLeadsByOrganisation(input);

    expect(results).toHaveLength(1);
    expect(results[0].name).toEqual('New Lead');
    expect(results[0].status).toEqual('new');
  });

  it('should filter by assigned broker', async () => {
    // Create organisation
    const [org] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test description'
      })
      .returning()
      .execute();

    // Create broker
    const [broker] = await db.insert(usersTable)
      .values({
        email: 'broker@test.com',
        first_name: 'Test',
        last_name: 'Broker',
        role: 'broker',
        organisation_id: org.id,
      })
      .returning()
      .execute();

    // Create leads with and without assigned broker
    await db.insert(leadsTable)
      .values([
        {
          name: 'Assigned Lead',
          insurance_types: JSON.stringify(['life']),
          status: 'new',
          source: 'website',
          estimated_value: '1000.00',
          organisation_id: org.id,
          assigned_broker_id: broker.id,
        },
        {
          name: 'Unassigned Lead',
          insurance_types: JSON.stringify(['auto']),
          status: 'new',
          source: 'referral',
          estimated_value: '2000.00',
          organisation_id: org.id,
          assigned_broker_id: null,
        }
      ])
      .execute();

    // Test filtering by specific broker
    const inputWithBroker: GetLeadsByOrganisationInput = {
      organisation_id: org.id,
      assigned_broker_id: broker.id,
      limit: 50,
      offset: 0,
    };

    const resultsWithBroker = await getLeadsByOrganisation(inputWithBroker);

    expect(resultsWithBroker).toHaveLength(1);
    expect(resultsWithBroker[0].name).toEqual('Assigned Lead');
    expect(resultsWithBroker[0].assigned_broker_id).toEqual(broker.id);

    // Test filtering by null broker (unassigned)
    const inputUnassigned: GetLeadsByOrganisationInput = {
      organisation_id: org.id,
      assigned_broker_id: null,
      limit: 50,
      offset: 0,
    };

    const resultsUnassigned = await getLeadsByOrganisation(inputUnassigned);

    expect(resultsUnassigned).toHaveLength(1);
    expect(resultsUnassigned[0].name).toEqual('Unassigned Lead');
    expect(resultsUnassigned[0].assigned_broker_id).toBeNull();
  });

  it('should apply pagination correctly', async () => {
    // Create organisation
    const [org] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test description'
      })
      .returning()
      .execute();

    // Create multiple leads
    const leadData = Array.from({ length: 5 }, (_, i) => ({
      name: `Lead ${i + 1}`,
      insurance_types: JSON.stringify(['life']),
      status: 'new' as const,
      source: 'website' as const,
      estimated_value: '1000.00',
      organisation_id: org.id,
    }));

    await db.insert(leadsTable)
      .values(leadData)
      .execute();

    // Test first page
    const firstPageInput: GetLeadsByOrganisationInput = {
      organisation_id: org.id,
      limit: 2,
      offset: 0,
    };

    const firstPageResults = await getLeadsByOrganisation(firstPageInput);

    expect(firstPageResults).toHaveLength(2);

    // Test second page
    const secondPageInput: GetLeadsByOrganisationInput = {
      organisation_id: org.id,
      limit: 2,
      offset: 2,
    };

    const secondPageResults = await getLeadsByOrganisation(secondPageInput);

    expect(secondPageResults).toHaveLength(2);

    // Ensure different results
    expect(firstPageResults[0].id).not.toEqual(secondPageResults[0].id);
  });

  it('should return empty array for non-existent organisation', async () => {
    const input: GetLeadsByOrganisationInput = {
      organisation_id: 999,
      limit: 50,
      offset: 0,
    };

    const results = await getLeadsByOrganisation(input);

    expect(results).toHaveLength(0);
  });
});
