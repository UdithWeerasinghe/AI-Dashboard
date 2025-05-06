/**
 * ExportButton - A standardized export button with ARIA label, tooltip, and keyboard accessibility.
 *
 * @param {Object} props
 * @param {function} props.onClick - Function to call on button click
 * @param {string} [props.label='Export Data'] - Tooltip and visible label
 * @param {string} [props.ariaLabel] - ARIA label for accessibility (defaults to label)
 * @param {Object} [props.props] - Additional props passed to IconButton
 */
import React from 'react';
import { IconButton, Tooltip as MuiTooltip } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';

const ExportButton = ({ onClick, label = 'Export Data', ariaLabel, ...props }) => (
  <MuiTooltip title={label}>
    <IconButton
      onClick={onClick}
      size="small"
      aria-label={ariaLabel || label}
      tabIndex={0}
      {...props}
    >
      <DownloadIcon />
    </IconButton>
  </MuiTooltip>
);

export default ExportButton; 