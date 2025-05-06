/**
 * ThemedTooltip - A reusable, theme-aware tooltip for charts.
 *
 * @param {Object} props
 * @param {string} [props.title] - Optional title for the tooltip
 * @param {Array<{text: string, color?: string, bold?: boolean, mt?: number}>} props.lines - Lines to display in the tooltip
 */
import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const ThemedTooltip = ({ title, lines = [] }) => {
  const theme = useTheme();
  return (
    <Box sx={{ bgcolor: theme.palette.background.paper, p: 2, border: `1px solid ${theme.palette.divider}`,
      borderRadius: 1, minWidth: 180 }}>
      {title && <Typography variant="subtitle2" sx={{ fontSize: 16 }}>{title}</Typography>}
      {lines.map((line, idx) => (
        <Typography
          key={idx}
          variant="body2"
          sx={{ fontSize: 15, color: line.color || 'inherit', fontWeight: line.bold ? 'bold' : 'normal', mt: line.mt || 0 }}
        >
          {line.text}
        </Typography>
      ))}
    </Box>
  );
};

export default ThemedTooltip; 