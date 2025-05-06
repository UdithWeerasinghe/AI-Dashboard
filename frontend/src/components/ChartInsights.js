import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Alert, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const COLORS = {
  revenue: '#1976d2',
  gross_profit_margin: '#ff9800',
  eps: '#388e3c',
  net_asset_per_share: '#7b1fa2',
  right_issues: '#c62828',
  operating_expenses: '#fbc02d',
  cost_of_sales: '#0288d1',
  net_profit: '#388e3c',
  // Add more as needed
};

const ChartInsights = ({ metric }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await fetch('/api/insights');
        if (!response.ok) throw new Error('Failed to fetch insights');
        const data = await response.json();
        setInsights(data[metric] || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, [metric]);

  if (loading) return <Box sx={{ p: 2 }}><CircularProgress size={20} /></Box>;
  if (error) return <Box sx={{ p: 2 }}><Alert severity="error">{error}</Alert></Box>;
  if (!insights.length) return null;

  return (
    <Card sx={{ mt: 2, background: COLORS[metric] + '22' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ color: COLORS[metric], fontWeight: 600, mb: 1 }}>
          AI-Generated Insights
        </Typography>
        <List dense>
          {insights.map((insight, idx) => (
            <ListItem key={idx}>
              <ListItemIcon>
                <FiberManualRecordIcon sx={{ color: COLORS[metric], fontSize: 12 }} />
              </ListItemIcon>
              <ListItemText primary={insight} />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default ChartInsights;