import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, CardContent, Typography, Box, IconButton, Grid
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area
} from 'recharts';
import ChartInsights from './ChartInsights';
import { Download as DownloadIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useTheme } from '@mui/material/styles';
import ExportButton from './common/ExportButton';
import ChartCard from './common/ChartCard';
import ThemedTooltip from './common/ThemedTooltip';
import { formatLkrMn, formatUsdTh } from '../utils/format';

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const value = currency === 'LKR' ? d.net_asset_per_share_lkr : d.net_asset_per_share_usd;
    const lines = [
      { text: `Net Asset Per Share: ${currency === 'LKR' ? formatLkrMn(value) : formatUsdTh(value)}` },
    ];
    if (d.industry_benchmark) lines.push({ text: `Industry Benchmark: ${formatLkrMn(d.industry_benchmark)}`, color: '#43a047' });
    if (d.forecast !== null) lines.push({ text: `Forecast: ${currency === 'LKR' ? formatLkrMn(d.forecast) : formatUsdTh(d.forecast)}`, color: '#ff9800' });
    return <ThemedTooltip title={`Year: ${label}`} lines={lines} />;
  }
  return null;
};

/**
 * NetAssetPerShare - Visualizes net asset per share trend, industry benchmark, forecasting, and export.
 *
 * @param {Object} props
 * @param {Array<Object>} props.data - Array of yearly net asset per share data
 * @param {string} props.currency - Selected currency ('LKR' or 'USD')
 */
const NetAssetPerShare = React.memo(({ data, currency }) => {
  const [forecast, setForecast] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    const responseKey = currency === 'LKR' ? 'net_asset_per_share_lkr' : 'net_asset_per_share_usd';
    const fetchForecast = async () => {
      const response = await fetch(`/api/forecast?metric=${responseKey}&periods=3`);
      if (response.ok) {
        const forecastData = await response.json();
        setForecast(forecastData.slice(data.length));
      }
    };
    fetchForecast();
  }, [data, currency]);

  // Example industry benchmark data (replace with real data if available)
  const industryBenchmarks = useMemo(() => ({
    2019: 150.00,
    2020: 155.00,
    2021: 160.00,
    2022: 165.00,
    2023: 170.00
  }), []);

  const valueKey = useMemo(() => currency === 'LKR' ? 'net_asset_per_share_lkr' : 'net_asset_per_share_usd', [currency]);
  const yAxisLabel = useMemo(() => currency === 'LKR' ? 'Net Asset Per Share (LKR Mn)' : 'Net Asset Per Share (USD K)', [currency]);
  const formatYAxis = useMemo(() => currency === 'LKR' ? formatLkrMn : formatUsdTh, [currency]);

  const lastActualYear = data[data.length - 1]?.year;
  const forecastData = useMemo(() => 
    forecast.filter(f => f.year > lastActualYear).map(f => ({
      year: f.year,
      [valueKey]: null,
      industry_benchmark: null,
      forecast: f.forecast < 0 ? 0 : f.forecast
    })), 
    [forecast, lastActualYear, valueKey]
  );

  const chartData = useMemo(() => [
    ...data.map(item => ({
      ...item,
      industry_benchmark: industryBenchmarks[item.year],
      forecast: item.year === lastActualYear ? item[valueKey] : null
    })),
    ...forecastData
  ], [data, forecastData, valueKey, industryBenchmarks, lastActualYear]);

  // Calculate max for Y-axis domain
  const maxValue = useMemo(() => Math.max(
    ...chartData.map(d =>
      d[valueKey] !== null && d[valueKey] !== undefined
        ? d[valueKey]
        : d.forecast || 0
    ),
    0
  ), [chartData, valueKey]);

  // Export to Excel
  const handleExport = useCallback(() => {
    const exportData = chartData.map(d => ({
      Year: d.year,
      'Net Asset Per Share': d[valueKey],
      'Industry Benchmark': d.industry_benchmark,
      Forecast: d.forecast
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Net Asset Per Share Data');
    XLSX.writeFile(wb, 'net_asset_per_share_data.xlsx');
  }, [chartData, valueKey]);

  return (
    <ChartCard
      title="Net Asset Per Share (5-Year Trend)"
      onExport={handleExport}
      exportLabel="Export Net Asset Per Share Data"
    >
      <Box sx={{ height: { xs: 240, sm: 320, md: 420 } }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 60, right: 40, left: 120, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis
              tickFormatter={formatYAxis}
              width={100}
              allowDecimals={false}
              domain={[
                0,
                maxValue ? Math.ceil(maxValue * 1.15) : 'auto'
              ]}
              label={{
                value: yAxisLabel,
                position: 'top',
                offset: 20,
                style: { textAnchor: 'middle', fontWeight: 600 }
              }}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Legend />
            {/* Actual Data */}
            <Area
              type="monotone"
              dataKey={valueKey}
              stroke={theme.palette.primary.main}
              fill={theme.palette.primary.main}
              fillOpacity={0.15}
              name="Net Asset Per Share"
            />
            <Line
              type="monotone"
              dataKey={valueKey}
              name="Net Asset Per Share"
              stroke={theme.palette.primary.main}
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
            />
            {/* Industry Benchmark */}
            <Line
              type="monotone"
              dataKey="industry_benchmark"
              name="Industry Benchmark"
              stroke={theme.palette.success.main}
              strokeDasharray="3 3"
              strokeWidth={2}
              dot={false}
            />
            {/* Forecast Data */}
            <Line
              type="monotone"
              dataKey="forecast"
              name="Forecast"
              stroke={theme.palette.warning.main}
              strokeDasharray="6 3"
              strokeWidth={3}
              dot={{ r: 5 }}
              activeDot={{ r: 8 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <ChartInsights metric="net_asset_per_share" />
    </ChartCard>
  );
});

export default NetAssetPerShare;