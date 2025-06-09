
import { db } from '../db';
import { leadsTable } from '../db/schema';
import { type GetReportsInput, type LeadConversionReport, type LeadSource, type InsuranceType } from '../schema';
import { eq, and, gte, lte, SQL } from 'drizzle-orm';

export const getLeadConversionReport = async (input: GetReportsInput): Promise<LeadConversionReport> => {
  try {
    // Build base conditions
    const conditions: SQL<unknown>[] = [
      eq(leadsTable.organisation_id, input.organisation_id)
    ];

    // Add date filters if provided
    if (input.start_date) {
      conditions.push(gte(leadsTable.created_at, input.start_date));
    }

    if (input.end_date) {
      conditions.push(lte(leadsTable.created_at, input.end_date));
    }

    // Execute query with all conditions
    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    
    const results = await db.select({
      status: leadsTable.status,
      source: leadsTable.source,
      insurance_types: leadsTable.insurance_types,
      estimated_value: leadsTable.estimated_value,
    })
    .from(leadsTable)
    .where(whereClause)
    .execute();

    // Calculate overall metrics
    const totalLeads = results.length;
    const convertedLeads = results.filter(r => r.status === 'converted').length;
    const conversionRate = totalLeads > 0 ? convertedLeads / totalLeads : 0;
    
    const totalEstimatedValue = results.reduce((sum, r) => sum + parseFloat(r.estimated_value), 0);
    const convertedValue = results
      .filter(r => r.status === 'converted')
      .reduce((sum, r) => sum + parseFloat(r.estimated_value), 0);

    // Calculate by source
    const sourceMap = new Map<LeadSource, { total: number; converted: number }>();
    
    results.forEach(result => {
      const source = result.source;
      const current = sourceMap.get(source) || { total: 0, converted: 0 };
      current.total++;
      if (result.status === 'converted') {
        current.converted++;
      }
      sourceMap.set(source, current);
    });

    const bySource = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      total: data.total,
      converted: data.converted,
      conversion_rate: data.total > 0 ? data.converted / data.total : 0,
    }));

    // Calculate by insurance type
    const insuranceTypeMap = new Map<InsuranceType, { total: number; converted: number }>();
    
    results.forEach(result => {
      const insuranceTypes = result.insurance_types as InsuranceType[];
      insuranceTypes.forEach(type => {
        const current = insuranceTypeMap.get(type) || { total: 0, converted: 0 };
        current.total++;
        if (result.status === 'converted') {
          current.converted++;
        }
        insuranceTypeMap.set(type, current);
      });
    });

    const byInsuranceType = Array.from(insuranceTypeMap.entries()).map(([insurance_type, data]) => ({
      insurance_type,
      total: data.total,
      converted: data.converted,
      conversion_rate: data.total > 0 ? data.converted / data.total : 0,
    }));

    return {
      organisation_id: input.organisation_id,
      total_leads: totalLeads,
      converted_leads: convertedLeads,
      conversion_rate: conversionRate,
      total_estimated_value: totalEstimatedValue,
      converted_value: convertedValue,
      by_source: bySource,
      by_insurance_type: byInsuranceType,
    };
  } catch (error) {
    console.error('Lead conversion report generation failed:', error);
    throw error;
  }
};
