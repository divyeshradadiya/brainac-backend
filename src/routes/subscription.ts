import { Router } from 'express';
import admin from 'firebase-admin';
import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { subscriptionPlans } from '../data/sample-data';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../types';

const router = Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret',
});

// Get subscription plans
router.get('/plans', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        plans: subscriptionPlans,
        trialDuration: '3 days',
        currency: 'INR'
      }
    });
  } catch (error: any) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription plans'
    });
  }
});

// Create payment order
router.post('/create-order', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { planId, amount } = req.body;

    if (!planId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'planId and amount are required'
      });
    }

    const options = {
      amount: amount * 100, // amount in paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: true,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id'
      }
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payment order'
    });
  }
});

// Verify payment
router.post('/verify-payment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret')
      .update(sign.toString())
      .digest('hex');

    if (razorpay_signature === expectedSign) {
      // Payment is valid, update user subscription
      const plan = subscriptionPlans.find(p => p.id === planId);
      if (!plan) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan selected'
        });
      }

      // Calculate subscription end date
      const now = new Date();
      let endDate = new Date(now);
      
      switch (plan.id) {
        case 'monthly':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
      }

      // Update Firebase custom claims
      await admin.auth().setCustomUserClaims(user.id, {
        class: user.class,
        subscriptionStatus: 'active',
        subscriptionPlan: plan.id,
        subscriptionStartDate: now.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
      });

      res.json({
        success: true,
        data: {
          message: 'Payment verified successfully',
          subscriptionStatus: 'active',
          subscriptionPlan: plan.name,
          subscriptionEndDate: endDate.toISOString(),
          paymentId: razorpay_payment_id
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Payment verification failed'
      });
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed'
    });
  }
});

// Get subscription status
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Calculate days remaining
    let daysRemaining = 0;
    let isExpired = false;
    let needsSubscription = false;

    if (user.subscriptionStatus === 'trial' && user.trialEndDate) {
      const trialEnd = new Date(user.trialEndDate);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      isExpired = daysRemaining === 0;
      needsSubscription = isExpired;
    } else if (user.subscriptionStatus === 'active') {
      // For active subscriptions, we'd calculate based on subscription end date
      daysRemaining = 30; // Default for demo
    } else {
      isExpired = true;
      needsSubscription = true;
    }

    res.json({
      success: true,
      data: {
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionStatus === 'active' ? 'active_plan' : undefined,
        trialEndDate: user.trialEndDate,
        subscriptionEndDate: user.subscriptionStatus === 'active' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        daysRemaining,
        isExpired,
        needsSubscription
      }
    });
  } catch (error: any) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status'
    });
  }
});

export default router;
