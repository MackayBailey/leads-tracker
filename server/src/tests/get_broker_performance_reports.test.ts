
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organisationsTable, usersTable, leadsTable } from '../db/schema';
import { type GetReportsInput } from '../schema';
import { getBrokerPerformanceReports } from '../handlers/get_broker_performance_reports';

const testInput: GetReportsInput = {
  organisation_id: 1,
};

describe('getBrokerPerformanceReports', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return broker performance reports', async () => {
    // Create test organisation
    const [organisation] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test organisation for broker reports'
      })
      .returning()
      .execute();

    // Create test brokers
    const [broker1] = await db.insert(usersTable)
      .values({
        email: 'broker1@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'broker',
        organisation_id: organisation.id,
        is_active: true
      })
      .returning()
      .execute();

    const [broker2] = await db.insert(usersTable)
      .values({
        email: 'broker2@test.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'broker',
        organisation_id: organisation.id,
        is_active: true
      })
      .returning()
      .execute();

    // Create test leads for broker1
    await db.insert(leadsTable)
      .values([
        {
          name: 'Lead 1',
          insurance_types: ['life'],
          source: 'referral',
          estimated_value: '1000.00',
          status: 'converted',
          organisation_id: organisation.id,
          assigned_broker_id: broker1.id
        },
        {
          name: 'Lead 2',
          insurance_types: ['auto'],
          source: 'website',
          estimated_value: '500.00',
          status: 'new',
          organisation_id: organisation.id,
          assigned_broker_id: broker1.id
        }
      ])
      .execute();

    // Create test leads for broker2
    await db.insert(leadsTable)
      .values([
        {
          name: 'Lead 3',
          insurance_types: ['health'],
          source: 'cold_call',
          estimated_value: '800.00',
          status: 'converted',
          organisation_id: organisation.id,
          assigned_broker_id: broker2.id
        },
        {
          name: 'Lead 4',
          insurance_types: ['home'],
          source: 'social_media',
          estimated_value: '1200.00',
          status: 'converted',
          organisation_id: organisation.id,
          assigned_broker_id: broker2.id
        },
        {
          name: 'Lead 5',
          insurance_types: ['business'],
          source: 'advertisement',
          estimated_value: '300.00',
          status: 'lost',
          organisation_id: organisation.id,
          assigned_broker_id: broker2.id
        }
      ])
      .execute();

    const results = await getBrokerPerformanceReports({
      organisation_id: organisation.id
    });

    expect(results).toHaveLength(2);

    // Find broker1 and broker2 results
    const broker1Result = results.find(r => r.broker_id === broker1.id);
    const broker2Result = results.find(r => r.broker_id === broker2.id);

    expect(broker1Result).toBeDefined();
    expect(broker1Result!.broker_name).toEqual('John Doe');
    expect(broker1Result!.total_leads).toEqual(2);
    expect(broker1Result!.converted_leads).toEqual(1);
    expect(broker1Result!.conversion_rate).toEqual(50);
    expect(broker1Result!.total_estimated_value).toEqual(1500);
    expect(broker1Result!.converted_value).toEqual(1000);

    expect(broker2Result).toBeDefined();
    expect(broker2Result!.broker_name).toEqual('Jane Smith');
    expect(broker2Result!.total_leads).toEqual(3);
    expect(broker2Result!.converted_leads).toEqual(2);
    expect(broker2Result!.conversion_rate).toEqual(66.67);
    expect(broker2Result!.total_estimated_value).toEqual(2300);
    expect(broker2Result!.converted_value).toEqual(2000);
  });

  it('should filter by date range', async () => {
    // Create test organisation
    const [organisation] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test organisation'
      })
      .returning()
      .execute();

    // Create test broker
    const [broker] = await db.insert(usersTable)
      .values({
        email: 'broker@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'broker',
        organisation_id: organisation.id,
        is_active: true
      })
      .returning()
      .execute();

    const oldDate = new Date('2023-01-01');
    const recentDate = new Date();

    // Create leads with different dates
    await db.insert(leadsTable)
      .values([
        {
          name: 'Old Lead',
          insurance_types: ['life'],
          source: 'referral',
          estimated_value: '1000.00',
          status: 'converted',
          organisation_id: organisation.id,
          assigned_broker_id: broker.id,
          created_at: oldDate
        },
        {
          name: 'Recent Lead',
          insurance_types: ['auto'],
          source: 'website',
          estimated_value: '500.00',
          status: 'converted',
          organisation_id: organisation.id,
          assigned_broker_id: broker.id,
          created_at: recentDate
        }
      ])
      .execute();

    // Filter for recent leads only
    const results = await getBrokerPerformanceReports({
      organisation_id: organisation.id,
      start_date: new Date('2024-01-01')
    });

    expect(results).toHaveLength(1);
    expect(results[0].total_leads).toEqual(1);
    expect(results[0].converted_leads).toEqual(1);
    expect(results[0].total_estimated_value).toEqual(500);
  });

  it('should include brokers with no leads', async () => {
    // Create test organisation
    const [organisation] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test organisation'
      })
      .returning()
      .execute();

    // Create broker with no leads
    const [broker] = await db.insert(usersTable)
      .values({
        email: 'broker@test.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'broker',
        organisation_id: organisation.id,
        is_active: true
      })
      .returning()
      .execute();

    const results = await getBrokerPerformanceReports({
      organisation_id: organisation.id
    });

    expect(results).toHaveLength(1);
    expect(results[0].broker_id).toEqual(broker.id);
    expect(results[0].broker_name).toEqual('John Doe');
    expect(results[0].total_leads).toEqual(0);
    expect(results[0].converted_leads).toEqual(0);
    expect(results[0].conversion_rate).toEqual(0);
    expect(results[0].total_estimated_value).toEqual(0);
    expect(results[0].converted_value).toEqual(0);
  });

  it('should exclude inactive brokers', async () => {
    // Create test organisation
    const [organisation] = await db.insert(organisationsTable)
      .values({
        name: 'Test Organisation',
        description: 'Test organisation'
      })
      .returning()
      .execute();

    // Create inactive broker
    await db.insert(usersTable)
      .values({
        email: 'inactive@test.com',
        first_name: 'Inactive',
        last_name: 'Broker',
        role: 'broker',
        organisation_id: organisation.id,
        is_active: false
      })
      .execute();

    const results = await getBrokerPerformanceReports({
      organisation_id: organisation.id
    });

    expect(results).toHaveLength(0);
  });
});
