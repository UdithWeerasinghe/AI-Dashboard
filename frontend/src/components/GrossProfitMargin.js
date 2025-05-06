import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card, CardContent, Typography, Box, IconButton, Tooltip as MuiTooltip
} from '@mui/material';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import { Download as DownloadIcon } from '@mui/icons-material';
import ChartInsights from './ChartInsights';
import * as XLSX from 'xlsx';
import { useTheme } from '@mui/material/styles';
import ExportButton from './common/ExportButton';
import ChartCard from './common/ChartCard';
import ThemedTooltip from './common/ThemedTooltip';
import { formatPercentage } from '../utils/format';

const calculateYoYGrowth = (current, previous) => {
  if (!current || !previous) return null;
  return ((current - previous) / previous) * 100;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    const lines = [
      { text: `Gross Profit Margin: ${formatPercentage(d.gross_profit_margin)}` },
    ];
    if (d.yoy_growth !== null) lines.push({ text: `YoY Growth: ${d.yoy_growth.toFixed(2)}%`, color: d.yoy_growth >= 0 ? '#43a047' : '#e53935' });
    if (d.forecast !== null) lines.push({ text: `Forecast: ${formatPercentage(d.forecast)}`, color: '#ff9800' });
    if (d.event) lines.push({ text: d.event.label, color: d.event.color, mt: 1 });
    return <ThemedTooltip title={`Year: ${label}`} lines={lines} />;
  }
  return null;
};

/**
 * GrossProfitMargin - Visualizes gross profit margin trend, event annotations, forecasting, and export.
 *
 * @param {Object} props
 * @param {Array<Object>} props.data - Array of yearly gross profit margin data
 */
const GrossProfitMargin = React.memo(({ data }) => {
  const [forecast, setForecast] = useState([]);
  const theme = useTheme();

  useEffect(() => {
    const fetchForecast = async () => {
      const response = await fetch(`/api/forecast?metric=gross_profit_margin&periods=3`);
      if (response.ok) {
        const forecastData = await response.json();
        setForecast(forecastData.slice(data.length));
      }
    };
    fetchForecast();
  }, [data]);

  // Calculate YoY growth and add events
  const processedData = useMemo(() => data.map((item, index) => {
    const previousYear = index > 0 ? data[index - 1].gross_profit_margin : null;
    const yoyGrowth = calculateYoYGrowth(item.gross_profit_margin, previousYear);
    let event = null;
    if (item.year === 2019) {
      event = {
        label: 'Easter Sunday Attacks Impact',
        color: '#e53935',
        description: 'Significant impact on business operations'
      };
    } else if (item.year === 2020) {
      event = {
        label: 'COVID-19 Impact',
        color: '#e53935',
        description: 'Pandemic-related challenges'
      };
    } else if (item.year === 2022) {
      event = {
        label: 'Tax Changes',
        color: '#ff9800',
        description: 'Implementation of new tax regulations'
      };
    }
    return {
      ...item,
      yoy_growth: yoyGrowth,
      event
    };
  }), [data]);

  const lastActualYear = data[data.length - 1]?.year;
  const forecastData = useMemo(() => 
    forecast.filter(f => f.year > lastActualYear).map(f => ({
      year: f.year,
      gross_profit_margin: null,
      forecast: f.forecast < 0 ? 0 : f.forecast,
      yoy_growth: null,
      event: null
    })), 
    [forecast, lastActualYear]
  );

  const chartData = useMemo(() => [
    ...processedData.map(item => ({
      ...item,
      forecast: item.year === lastActualYear ? item.gross_profit_margin : null
    })),
    ...forecastData
  ], [processedData, forecastData, lastActualYear]);

  // Calculate max for Y-axis domain
  const maxValue = useMemo(() => Math.max(
    ...chartData.map(d => {
      const values = [d.gross_profit_margin, d.forecast].filter(v => v !== null && v !== undefined);
      return values.length ? Math.max(...values) : 0;
    }),
    0
  ), [chartData]);

  // Export to Excel
  const handleExport = useCallback(() => {
    const exportData = chartData.map(d => ({
      Year: d.year,
      'Gross Profit Margin': `${d.gross_profit_margin ? d.gross_profit_margin.toFixed(2) : ''}%`,
      'YoY Growth': d.yoy_growth ? `${d.yoy_growth.toFixed(2)}%` : 'N/A',
      Forecast: d.forecast ? `${d.forecast.toFixed(2)}%` : 'N/A'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gross Profit Margin Data');
    XLSX.writeFile(wb, 'gross_profit_margin_data.xlsx');
  }, [chartData]);

  return (
    <ChartCard
      title="Gross Profit Margin Trend (5-Year Analysis)"
      onExport={handleExport}
      exportLabel="Export Gross Profit Margin Data"
    >
      <Box sx={{ height: { xs: 240, sm: 320, md: 420 } }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 60, right: 40, left: 80, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis
              tickFormatter={formatPercentage}
              label={{
                value: 'Gross Profit Margin (%)',
                position: 'top',
                offset: 20,
                style: { textAnchor: 'middle', fontWeight: 600 }
              }}
              allowDecimals={false}
              width={90}
              domain={[0, maxValue ? Math.ceil(maxValue * 1.15) : 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="gross_profit_margin"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Gross Profit Margin"
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke={theme.palette.warning.main}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Forecast"
            />
            {/* Event Annotations */}
            <ReferenceLine
              x={2019}
              stroke={theme.palette.error.main}
              label={{
                value: "Easter Sunday Attacks",
                position: "top",
                fill: theme.palette.error.main,
                fontWeight: "bold",
                offset: 40
              }}
            />
            <ReferenceLine
              x={2020}
              stroke={theme.palette.error.main}
              label={{
                value: "COVID-19 Impact",
                position: "top",
                fill: theme.palette.error.main,
                fontWeight: "bold",
                offset: 40
              }}
            />
            <ReferenceLine
              x={2022}
              stroke={theme.palette.warning.main}
              label={{
                value: "Tax Changes",
                position: "top",
                fill: theme.palette.warning.main,
                fontWeight: "bold",
                offset: 40
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
      <ChartInsights metric="gross_profit_margin" />
    </ChartCard>
  );
});

export default GrossProfitMargin;