import React from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

const LoadingErrorState = ({ loading, error, onRetry, children }) => {
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 300,
        width: '100%'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 300,
        width: '100%',
        gap: 2
      }}>
        <ErrorIcon color="error" sx={{ fontSize: 48 }} />
        <Typography variant="h6" color="error">
          {error}
        </Typography>
        {onRetry && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={onRetry}
          >
            Retry
          </Button>
        )}
      </Box>
    );
  }

  return children;
};

export default LoadingErrorState; 