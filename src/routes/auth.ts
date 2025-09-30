import { Router } from 'express';
import admin from 'firebase-admin';
import { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../types';

const router = Router();

// Register/Login with Firebase
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
    });

    res.status(201).json({
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        class: userClass,
        subscriptionStatus: 'trial',
        trialEndDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
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