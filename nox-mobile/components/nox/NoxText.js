import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { Typography } from '../../constants/typography';

const VARIANTS = {
  title: Typography.title,
  titleSecondary: Typography.titleSecondary,
  description: Typography.description,
  secondary: Typography.secondary,
  button: Typography.button,
  buttonSecondary: Typography.buttonSecondary,
  form: Typography.form,
  label: Typography.label,
};

/**
 * Texte avec variante typo Figma (Satoshi).
 * @param {'title'|'titleSecondary'|'description'|'secondary'|'button'|'buttonSecondary'|'form'|'label'} variant
 */
export default function NoxText({ variant = 'description', style, children, ...rest }) {
  const base = VARIANTS[variant] || Typography.description;
  return (
    <RNText style={[base, style]} {...rest}>
      {children}
    </RNText>
  );
}

export { VARIANTS as NoxTextVariants };
