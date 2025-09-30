import { Request } from 'express';

// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  class: number; // 5-10
  avatar?: string;
  isEmailVerified: boolean;
  subscriptionStatus: 'trial' | 'active' | 'expired';
  trialStartDate?: Date;
  trialEndDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Authentication types
export interface AuthRequest extends Request {
  user?: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  class: number;
}

// Content types
export interface Subject {
  id: string;
  name: string;
  description: string;
  class: number;
  icon: string;
  color: string;
  topics: Topic[];
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  class: number;
  videos: Video[];
  isPremium: boolean;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  duration: string;
  topicId: string;
  class: number;
  isPremium: boolean;
  views?: number;
  likes?: number;
}

// Payment types
export interface PaymentOrder {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'created' | 'attempted' | 'paid' | 'failed';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: 'monthly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate: Date;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
}