import React from 'react';
import { IconButton, Tooltip, useTheme } from '@mui/material';
import type { IconButtonProps } from '@mui/material';

interface ShadowIconButtonProps extends IconButtonProps {
  tooltip?: string;
  shadowIntensity?: 'light' | 'medium' | 'strong';
  variant?: 'primary' | 'secondary' | 'error';
}

const getShadow = (intensity: 'light' | 'medium' | 'strong' = 'medium') => {
  switch (intensity) {
    case 'light':
      return '0 4px 8px rgba(0,0,0,0.15)';
    case 'medium':
      return '0 6px 12px rgba(0,0,0,0.18)';
    case 'strong':
      return '0 8px 18px rgba(0,0,0,0.25)';
    default:
      return '0 6px 12px rgba(0,0,0,0.18)';
  }
};

const ShadowIconButton: React.FC<ShadowIconButtonProps> = ({
  tooltip,
  shadowIntensity = 'medium',
  variant,
  sx,
  children,
  ...props
}) => {
  const theme = useTheme();
  const shadow = getShadow(shadowIntensity);

  const getVariantStyles = () => {
    if (variant === 'primary') {
      return {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.secondary.main,
        '&:hover': {
          backgroundColor: theme.palette.secondary.main,
          color: theme.palette.primary.main,
        },
      };
    }
    if (variant === 'secondary') {
      return {
        backgroundColor: theme.palette.secondary.main,
        color: theme.palette.primary.main,
        '&:hover': {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.secondary.main,
        },
      };
    }
    if (variant === 'error') {
      return {
        backgroundColor: theme.palette.error.main,
        color: theme.palette.error.contrastText,
        '&:hover': {
          backgroundColor: theme.palette.error.dark,
          color: theme.palette.error.contrastText,
        },
      };
    }
    return {};
  };

  const button = (
    <IconButton
      sx={{
        boxShadow: shadow,
        transition: 'all 0.2s ease-in-out',
        '&:active': {
          transform: 'translateY(2px)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        },
        ...getVariantStyles(),
        ...sx,
      }}
      {...props}
    >
      {children}
    </IconButton>
  );

  if (tooltip) {
    return <Tooltip title={tooltip}>{button}</Tooltip>;
  }

  return button;
};

export default ShadowIconButton;