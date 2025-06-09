
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target, 
  Download,
  RefreshCw
} from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  LeadConversionReport, 
  BrokerPerformanceReport
} from '../../../server/src/schema';

interface ReportsAnalyticsProps {
  organisationId: number;
  currentUser: User;
}

export function ReportsAnalytics({ organisationId }: ReportsAnalyticsProps) {
  const [conversionReport, setConversionReport] = useState<LeadConversionReport | null>(null);
  const [brokerReports, setBrokerReports] = useState<BrokerPerformanceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'30' | '90' | '365' | 'all'>('30');

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Calculate date range
      let startDate: Date | undefined;
      const endDate = new Date();
      
      if (dateRange !== 'all') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(dateRange));
      }

      const [conversionData, brokerData] = await Promise.all([
        trpc.getLeadConversionReport.query({
          organisation_id: organisationId,
          start_date: startDate,
          end_date: endDate
        }),
        trpc.getBrokerPerformanceReports.query({
          organisation_id: organisationId,
          start_date: startDate,
          end_date: endDate
        })
      ]);

      setConversionReport(conversionData);
      setBrokerReports(brokerData);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organisationId, dateRange]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600">Track performance and conversion metrics</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={(value: '30' | '90' | '365' | 'all') => setDateRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm" onClick={loadReports}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversion">Conversion Analysis</TabsTrigger>
          <TabsTrigger value="brokers">Broker Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{conversionReport?.total_leads || 0}</div>
                <p className="text-xs text-muted-foreground">
                  In selected period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {conversionReport ? formatPercentage(conversionReport.conversion_rate) : '0%'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {conversionReport?.converted_leads || 0} of {conversionReport?.total_leads || 0} leads
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {conversionReport ? formatCurrency(conversionReport.total_estimated_value) : '$0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Estimated total value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Converted Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {conversionReport ? formatCurrency(conversionReport.converted_value) : '$0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  From converted leads
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Lead Sources Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Performance by Lead Source</CardTitle>
                <CardDescription>Conversion rates across different sources</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {conversionReport?.by_source.map((source) => (
                  <div key={source.source} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">
                        {source.source.replace('_', ' ')}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {source.converted}/{source.total}
                        </span>
                        <Badge variant="secondary">
                          {formatPercentage(source.conversion_rate)}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={source.conversion_rate * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Insurance Types Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Performance by Insurance Type</CardTitle>
                <CardDescription>Conversion rates by insurance category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {conversionReport?.by_insurance_type.map((type) => (
                  <div key={type.insurance_type} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium capitalize">
                        {type.insurance_type}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {type.converted}/{type.total}
                        </span>
                        <Badge variant="secondary">
                          {formatPercentage(type.conversion_rate)}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={type.conversion_rate * 100} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="brokers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Broker Performance</CardTitle>
              <CardDescription>Individual broker statistics and performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {brokerReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No broker performance data available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {brokerReports.map((broker: BrokerPerformanceReport) => (
                    <div key={broker.broker_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-lg">{broker.broker_name}</h4>
                          <p className="text-sm text-gray-600">Broker ID: {broker.broker_id}</p>
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          {formatPercentage(broker.conversion_rate)} conversion
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Total Leads</p>
                          <p className="text-xl font-semibold">{broker.total_leads}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Converted</p>
                          <p className="text-xl font-semibold text-green-600">{broker.converted_leads}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Pipeline Value</p>
                          <p className="text-lg font-semibold">{formatCurrency(broker.total_estimated_value)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Converted Value</p>
                          <p className="text-lg font-semibold text-green-600">{formatCurrency(broker.converted_value)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">Conversion Progress</span>
                          <span className="text-sm font-medium">{formatPercentage(broker.conversion_rate)}</span>
                        </div>
                        <Progress value={broker.conversion_rate * 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
