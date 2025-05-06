/**
 * ChartCard - A reusable card wrapper for charts, header, export button, and actions.
 *
 * @param {Object} props
 * @param {string} props.title - The card header/title
 * @param {function} [props.onExport] - Function to call for export (shows export button if provided)
 * @param {string} [props.exportLabel] - Label for the export button
 * @param {React.ReactNode} [props.actions] - Additional actions/buttons to show in the header
 * @param {React.ReactNode} props.children - Chart and content to render inside the card
 */
import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import ExportButton from './ExportButton';

const ChartCard = ({ title, onExport, exportLabel, actions, children }) => (
  <Card sx={{ mb: { xs: 2, sm: 3 }, boxShadow: { xs: 1, sm: 2 } }}>
    <CardContent sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: { xs: 1, sm: 2 } }}>
        <Typography variant="h6" sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }}>{title}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: { xs: 1, sm: 0 } }}>
          {actions}
          {onExport && <ExportButton onClick={onExport} label={exportLabel} ariaLabel={exportLabel} />}
        </Box>
      </Box>
      {children}
    </CardContent>
  </Card>
);

export default ChartCard; 