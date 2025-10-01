import { Router } from 'express';
import admin from 'firebase-admin';
import { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../types';

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

    if (userClass < 5 || userClass > 10) {
      return res.status(400).json({
        success: false,
        error: 'Class must be between 5 and 10',
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

    // Create user in Firebase
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
      emailVerified: false,
    });

    // Set custom claims for user class and subscription
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      class: userClass,
      subscriptionStatus: 'trial',
      trialStartDate: new Date().toISOString(),
      trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days trial
      firstName,
      lastName
    });

    // Create custom token for frontend
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    res.status(201).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        class: userClass,
        subscriptionStatus: 'trial',
        trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
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

    // Create custom token for authentication
    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    // Get user custom claims
    const userClaims = userRecord.customClaims || {};

    res.status(200).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        class: userClaims.class || 5,
        subscriptionStatus: userClaims.subscriptionStatus || 'trial',
        trialEndDate: userClaims.trialEndDate,
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

    const updateData: any = {};
    
    if (firstName && lastName) {
      updateData.displayName = `${firstName} ${lastName}`;
    }

    if (userClass && userClass >= 5 && userClass <= 10) {
      // Update custom claims
      await admin.auth().setCustomUserClaims(user.id, {
        class: userClass,
        subscriptionStatus: user.subscriptionStatus,
        trialStartDate: user.trialStartDate,
        trialEndDate: user.trialEndDate,
      });
    }

    if (Object.keys(updateData).length > 0) {
      await admin.auth().updateUser(user.id, updateData);
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