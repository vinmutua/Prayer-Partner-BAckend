/**
 * Utility functions for type conversion and validation
 */

/**
 * Converts a value to a number
 * @param value - Value to convert
 * @param defaultValue - Default value if conversion fails
 * @returns Converted number or default value
 */
export const toNumber = (value: string | number | undefined | null, defaultValue: number = 0): number => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'number') return value;
  
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Converts a value to a boolean
 * @param value - Value to convert
 * @param defaultValue - Default value if conversion fails
 * @returns Converted boolean or default value
 */
export const toBoolean = (value: string | boolean | undefined | null, defaultValue: boolean = false): boolean => {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  
  if (typeof value === 'string') {
    const lowercased = value.toLowerCase();
    if (lowercased === 'true' || lowercased === '1' || lowercased === 'yes') return true;
    if (lowercased === 'false' || lowercased === '0' || lowercased === 'no') return false;
  }
  
  return defaultValue;
};

/**
 * Ensures a value is a string
 * @param value - Value to convert
 * @param defaultValue - Default value if conversion fails
 * @returns String value or default
 */
export const toString = (value: any, defaultValue: string = ''): string => {
  if (value === undefined || value === null) return defaultValue;
  return String(value);
};
