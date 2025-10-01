import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import type { AuthRequest, User } from '../types';

// Firebase Admin SDK is initialized in index.ts

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Get user from Firebase
    const userRecord = await admin.auth().getUser(decodedToken.uid);
    
    // Extract custom claims
    const customClaims = decodedToken.firebase?.sign_in_provider 
      ? decodedToken  // Custom claims are in the token
      : (userRecord.customClaims || {}); // Fallback to user record claims
    
    // Parse displayName to get first and last name
    const nameParts = userRecord.displayName?.split(' ') || [];
    const firstName = customClaims.firstName || nameParts[0] || '';
    const lastName = customClaims.lastName || nameParts.slice(1).join(' ') || '';
    
    // Attach user to request
    req.user = {
      id: userRecord.uid,
      email: userRecord.email || '',
      firstName,
      lastName,
      class: customClaims.class || 6, // From custom claims or default
      isEmailVerified: userRecord.emailVerified,
      subscriptionStatus: customClaims.subscriptionStatus || 'trial',
      trialEndDate: customClaims.trialEndDate ? new Date(customClaims.trialEndDate) : undefined,
      subscriptionEndDate: customClaims.subscriptionEndDate ? new Date(customClaims.subscriptionEndDate) : undefined,
      createdAt: new Date(userRecord.metadata.creationTime),
      updatedAt: new Date(userRecord.metadata.lastSignInTime || userRecord.metadata.creationTime),
    } as User;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token.',
    });
  }
};

export const requireSubscription = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated.',
    });
  }

  // Check if user has active subscription or is in trial period
  const { subscriptionStatus, trialEndDate } = req.user;
  
  if (subscriptionStatus === 'active') {
    return next();
  }
  
  if (subscriptionStatus === 'trial' && trialEndDate && new Date() < trialEndDate) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Active subscription required to access this content.',
    subscriptionRequired: true,
  });
};