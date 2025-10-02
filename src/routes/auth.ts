import { Router } from 'express';
import admin from 'firebase-admin';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '@/middleware/auth';
import { db } from '../index';
import {
  UserDocument,
  PaymentDocument,
  SubscriptionHistoryDocument,
  COLLECTIONS,
  createUserDocument,
  createSubscriptionHistoryDocument
} from '@/types/firestore';
import type { AuthRequest } from '@/types';

const router = Router();

// Register user - backend handles Firebase user creation
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, class: userClass } = req.body;

    // Validate input
    if (!email || !password || !firstName || !lastName || !userClass) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required',
      });
    }

    if (userClass < 6 || userClass > 10) {
      return res.status(400).json({
        success: false,
        error: 'Class must be between 6 and 10',
      });
    }

    // Check if user already exists
    try {
      await admin.auth().getUserByEmail(email);
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email',
      });
    } catch (error: any) {
      // User doesn't exist, which is what we want for registration
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      emailVerified: false,
    });

    // Create user document in Firestore
    const userDocData = createUserDocument({
      uid: userRecord.uid,
      email: userRecord.email!,
      firstName,
      lastName,
      class: userClass,
    });

    if (db) {
      await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set(userDocData);

      // Create initial subscription history entry
      const subscriptionHistoryData = createSubscriptionHistoryDocument({
        userId: userRecord.uid,
        planId: 'monthly', // default, will be trial
        status: 'trial',
        startDate: userDocData.trialStartDate,
        endDate: userDocData.trialEndDate,
      });

      await db.collection(COLLECTIONS.SUBSCRIPTION_HISTORY).add(subscriptionHistoryData);
    }

    // Create JWT token for authentication (instead of Firebase custom token)
    const jwtPayload = {
      uid: userRecord.uid,
      email: userRecord.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };
    
    const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key';
    const customToken = jwt.sign(jwtPayload, jwtSecret);

    res.status(201).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        class: userDocData.class,
        subscriptionStatus: userDocData.subscriptionStatus,
        trialEndDate: userDocData.trialEndDate,
        customToken: customToken
      },
      message: 'User registered successfully',
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
});

// Login user - backend handles Firebase authentication
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Get user by email to verify existence
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }
      throw error;
    }

    // Create JWT token for authentication (instead of Firebase custom token)
    const jwtPayload = {
      uid: userRecord.uid,
      email: userRecord.email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    };
    
    const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret-key';
    const customToken = jwt.sign(jwtPayload, jwtSecret);

    // Get user data from Firestore
    let userData: UserDocument | null = null;
    if (db) {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).get();
      if (userDoc.exists) {
        userData = userDoc.data() as UserDocument;
      }
    }

    // Fallback to custom claims if Firestore data not found (for migration)
    const userClaims = userRecord.customClaims || {};
    const finalUserData = userData || {
      uid: userRecord.uid,
      email: userRecord.email!,
      displayName: userRecord.displayName!,
      class: userClaims.class || 5,
      subscriptionStatus: userClaims.subscriptionStatus || 'trial',
      trialEndDate: userClaims.trialEndDate,
    };

    res.status(200).json({
      success: true,
      data: {
        uid: finalUserData.uid,
        email: finalUserData.email,
        displayName: finalUserData.displayName,
        class: finalUserData.class,
        subscriptionStatus: finalUserData.subscriptionStatus,
        trialEndDate: finalUserData.trialEndDate,
        customToken: customToken
      },
      message: 'Login successful',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      error: error.message || 'Login failed',
    });
  }
});

// Get user profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        uid: user.id,
        email: user.email,
        displayName: `${user.firstName} ${user.lastName}`,
        class: user.class,
        subscriptionStatus: user.subscriptionStatus,
        trialEndDate: user.trialEndDate,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Profile fetch error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token or user not found',
    });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { firstName, lastName, class: userClass } = req.body;

    const updateData: Partial<UserDocument> = {
      updatedAt: new Date().toISOString(),
    };
    
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (firstName || lastName) {
      updateData.displayName = `${firstName || user.firstName} ${lastName || user.lastName}`;
    }
    if (userClass && userClass >= 5 && userClass <= 10) {
      updateData.class = userClass;
    }

    // Update user document in Firestore
    if (db && Object.keys(updateData).length > 0) {
      await db.collection(COLLECTIONS.USERS).doc(user.id).update(updateData);
    }

    // Also update Firebase Auth display name if name changed
    if ((firstName || lastName) && db) {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.id).get();
      if (userDoc.exists) {
        const currentData = userDoc.data() as UserDocument;
        await admin.auth().updateUser(user.id, {
          displayName: currentData.displayName,
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Profile updated successfully'
      }
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Profile update failed',
    });
  }
});

export default router;