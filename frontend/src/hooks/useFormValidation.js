// src/hooks/useFormValidation.js
import { useState, useCallback } from 'react';

export const useFormValidation = (initialValues, validationRules) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback((fieldName, value) => {
    const rule = validationRules[fieldName];
    if (!rule) return '';

    if (rule.required && (!value || value.trim() === '')) {
      return rule.required;
    }

    if (rule.pattern && value && !rule.pattern.test(value)) {
      return rule.patternMessage || 'Invalid format';
    }

    if (rule.minLength && value && value.length < rule.minLength) {
      return rule.minLengthMessage || `Minimum ${rule.minLength} characters required`;
    }

    if (rule.maxLength && value && value.length > rule.maxLength) {
      return rule.maxLengthMessage || `Maximum ${rule.maxLength} characters allowed`;
    }

    if (rule.custom && value !== undefined) {
      return rule.custom(value, values) || '';
    }

    return '';
  }, [validationRules, values]);

  const validateAll = useCallback(() => {
    const newErrors = {};
    Object.keys(validationRules).forEach(fieldName => {
      const error = validate(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validate, validationRules]);

  const handleChange = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    if (touched[fieldName]) {
      const error = validate(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  }, [touched, validate]);

  const handleBlur = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validate(fieldName, values[fieldName]);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, [values, validate]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isValid = Object.keys(errors).length === 0 && 
                  Object.keys(touched).length > 0;

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    reset,
    isValid,
    setValues,
    setErrors
  };
};