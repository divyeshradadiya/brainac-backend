import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';
import { Request, Response, NextFunction } from 'express';
import { db } from '../index';
import { COLLECTIONS, UserDocument } from '../types/firestore';
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

    let decodedToken: any;
    let userRecord: any;

    try {
      // First try to verify as ID token
      decodedToken = await admin.auth().verifyIdToken(token);
      userRecord = await admin.auth().getUser(decodedToken.uid);
    } catch (idTokenError) {
      // If ID token verification fails, try to verify as our custom JWT
      try {
        const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key';
        const decoded = jwt.verify(token, jwtSecret) as any;
        
        // Check if it's an admin token
        if (decoded.isAdmin && decoded.role === 'admin') {
          // Admin token - create a mock user object
          req.user = {
            id: 'admin',
            email: decoded.email,
            firstName: 'Admin',
            lastName: 'User',
            class: 12, // Admin has access to all classes
            isEmailVerified: true,
            subscriptionStatus: 'active',
            isAdmin: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any;
          return next();
        }
        
        if (!decoded.uid) {
          throw new Error('Token missing uid claim');
        }

        // Get user record from Firebase Auth using the uid from the token
        userRecord = await admin.auth().getUser(decoded.uid);
        decodedToken = { uid: decoded.uid };
        
      } catch (customTokenError) {
        console.error('Token verification failed:', {
          idTokenError: idTokenError instanceof Error ? idTokenError.message : 'ID token verification failed',
          customTokenError: customTokenError instanceof Error ? customTokenError.message : 'Custom JWT verification failed'
        });
        return res.status(401).json({
          success: false,
          error: 'Invalid token.',
        });
      }
    }    // Get user data from Firestore
    let userData: UserDocument | null = null;
    if (db) {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(decodedToken.uid).get();
      if (userDoc.exists) {
        userData = userDoc.data() as UserDocument;
      }
    }

    // Fallback to custom claims if Firestore data not found (for migration)
    const customClaims = userRecord.customClaims || {};
    const finalUserData = userData || {
      uid: userRecord.uid,
      email: userRecord.email || '',
      firstName: customClaims.firstName || userRecord.displayName?.split(' ')[0] || '',
      lastName: customClaims.lastName || userRecord.displayName?.split(' ').slice(1).join(' ') || '',
      class: customClaims.class || 6,
      subscriptionStatus: customClaims.subscriptionStatus || 'trial',
      trialEndDate: customClaims.trialEndDate,
      subscriptionEndDate: customClaims.subscriptionEndDate,
    };
    
    // Attach user to request
    req.user = {
      id: finalUserData.uid,
      email: finalUserData.email,
      firstName: finalUserData.firstName,
      lastName: finalUserData.lastName,
      class: finalUserData.class,
      isEmailVerified: userRecord.emailVerified,
      subscriptionStatus: finalUserData.subscriptionStatus,
      trialEndDate: finalUserData.trialEndDate ? new Date(finalUserData.trialEndDate) : undefined,
      subscriptionEndDate: finalUserData.subscriptionEndDate ? new Date(finalUserData.subscriptionEndDate) : undefined,
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