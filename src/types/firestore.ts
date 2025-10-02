// Firestore data schemas and types for Brainac application

export interface UserDocument {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  class: number; // 6-10
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled';
  subscriptionPlan?: 'monthly' | 'quarterly' | 'yearly';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  trialStartDate?: string;
  trialEndDate?: string;
  createdAt: string;
  updatedAt: string;
  preferences?: {
    notifications: boolean;
    emailUpdates: boolean;
    language: string;
  };
}

export interface PaymentDocument {
  id: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  planId: 'monthly' | 'quarterly' | 'yearly';
  amount: number; // in rupees
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod?: string;
  refundReason?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectDocument {
  id: string;
  name: string;
  description: string;
  grade: number; // 6-10
  icon: string;
  color: string;
  videoCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UnitDocument {
  id: string;
  name: string;
  description: string;
  subjectId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterDocument {
  id: string;
  name: string;
  description: string;
  unitId: string;
  subjectId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface VideoDocument {
  id: string;
  title: string;
  description: string;
  subject: string;
  subjectId: string;
  unitId: string;
  chapterId: string;
  grade: number;
  duration: string;
  videoUrl: string;
  thumbnail: string;
  views: number;
  likes: number;
  order: number;
  category?: string;
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionHistoryDocument {
  id: string;
  userId: string;
  planId: 'monthly' | 'quarterly' | 'yearly';
  status: 'trial' | 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate?: string;
  paymentId?: string;
  createdAt: string;
  updatedAt: string;
}

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  PAYMENTS: 'payments',
  SUBSCRIPTION_HISTORY: 'subscriptionHistory',
  SUBJECTS: 'subjects',
  UNITS: 'units',
  CHAPTERS: 'chapters',
  VIDEOS: 'videos',
} as const;

// Helper functions for Firestore operations
export const createUserDocument = (userData: Partial<UserDocument>): UserDocument => {
  const now = new Date().toISOString();
  return {
    uid: userData.uid!,
    email: userData.email!,
    firstName: userData.firstName!,
    lastName: userData.lastName!,
    displayName: `${userData.firstName} ${userData.lastName}`,
    class: userData.class || 6,
    subscriptionStatus: 'trial',
    trialStartDate: now,
    trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    createdAt: now,
    updatedAt: now,
    preferences: {
      notifications: true,
      emailUpdates: true,
      language: 'en',
    },
    ...userData,
  };
};

export const createPaymentDocument = (paymentData: Partial<PaymentDocument>): PaymentDocument => {
  const now = new Date().toISOString();
  return {
    id: paymentData.id || `payment_${Date.now()}`,
    userId: paymentData.userId!,
    razorpayOrderId: paymentData.razorpayOrderId!,
    razorpayPaymentId: paymentData.razorpayPaymentId || '',
    razorpaySignature: paymentData.razorpaySignature || '',
    planId: paymentData.planId!,
    amount: paymentData.amount!,
    currency: paymentData.currency || 'INR',
    status: paymentData.status || 'pending',
    createdAt: now,
    updatedAt: now,
    ...paymentData,
  };
};

export const createSubscriptionHistoryDocument = (historyData: Partial<SubscriptionHistoryDocument>): SubscriptionHistoryDocument => {
  const now = new Date().toISOString();
  return {
    id: historyData.id || `sub_${Date.now()}`,
    userId: historyData.userId!,
    planId: historyData.planId!,
    status: historyData.status || 'trial',
    startDate: historyData.startDate || now,
    endDate: historyData.endDate,
    paymentId: historyData.paymentId,
    createdAt: now,
    updatedAt: now,
    ...historyData,
  };
};