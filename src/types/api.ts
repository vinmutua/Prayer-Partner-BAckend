/**
 * Standard API response interface
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  statusCode: number;
  error?: string;
}

/**
 * User interface
 */
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MEMBER';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prayer Theme interface
 */
export interface PrayerTheme {
  id: number;
  title: string;
  description: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prayer Request interface
 */
export interface PrayerRequest {
  id: number;
  content: string;
  isActive: boolean;
  userId: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prayer Pairing interface
 */
export interface PrayerPairing {
  id: number;
  startDate: Date;
  endDate: Date;
  partner1Id: number;
  partner2Id: number;
  themeId: number;
  requestId?: number;
  isSpecialPairing: boolean;
  createdAt: Date;
  updatedAt: Date;
}
