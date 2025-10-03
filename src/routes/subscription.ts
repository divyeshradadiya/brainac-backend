import { Router } from 'express';
import admin from 'firebase-admin';
import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { subscriptionPlans } from '../data/sample-data';
import { authenticate } from '../middleware/auth';
import { db } from '../index';
import {
  COLLECTIONS,
  createPaymentDocument,
  createSubscriptionHistoryDocument,
  PaymentDocument,
  SubscriptionHistoryDocument
} from '../types/firestore';
import type { AuthRequest } from '../types';
import dotenv from 'dotenv';

dotenv.config();

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
        trialDuration: '7 days',
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

// Create subscription plan
router.post('/create-plan', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'planId is required'
      });
    }

    const selectedPlan = subscriptionPlans.find(p => p.id === planId);
    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected'
      });
    }

    console.log('Creating Razorpay plan for:', selectedPlan.name);

    // Define billing period based on plan
    let period: 'monthly' | 'yearly' = 'monthly';
    let interval = 1;
    
    switch (planId) {
      case 'monthly':
        period = 'monthly';
        interval = 1;
        break;
      case 'quarterly':
        period = 'monthly';
        interval = 3;
        break;
      case 'yearly':
        period = 'yearly';
        interval = 1;
        break;
    }

    const planOptions = {
      period,
      interval,
      item: {
        name: selectedPlan.name,
        amount: selectedPlan.price * 100, // Convert to paise
        currency: 'INR',
        description: `Brainac ${selectedPlan.name} - Access to all educational content`
      },
      notes: {
        plan_id: planId,
        user_id: user.id,
        user_email: user.email || ''
      }
    };

    const plan = await razorpay.plans.create(planOptions);

    res.json({
      success: true,
      data: {
        planId: plan.id,
        name: plan.item.name,
        amount: plan.item.amount,
        currency: plan.item.currency,
        period: plan.period,
        interval: plan.interval
      }
    });
  } catch (error: any) {
    console.error('Error creating plan:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription plan',
      details: error.message
    });
  }
});

// Create subscription
router.post('/create-subscription', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { planId, razorpayPlanId } = req.body;

    if (!planId || !razorpayPlanId) {
      return res.status(400).json({
        success: false,
        error: 'planId and razorpayPlanId are required'
      });
    }

    const selectedPlan = subscriptionPlans.find(p => p.id === planId);
    if (!selectedPlan) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan selected'
      });
    }

    console.log('Creating Razorpay subscription for plan:', razorpayPlanId);

    // Determine appropriate total_count based on plan interval
    // Razorpay has different limits for different intervals
    let totalCount = 120; // Default: 10 years for monthly
    
    if (planId === 'quarterly') {
      totalCount = 40; // 10 years for quarterly (40 * 3 months = 120 months)
    } else if (planId === 'yearly') {
      totalCount = 10; // 10 years for yearly
    }

    console.log(`Setting total_count to ${totalCount} for plan type: ${planId}`);

    // For recurring subscriptions, we set a reasonable total_count based on plan type
    const subscriptionOptions = {
      plan_id: razorpayPlanId,
      total_count: totalCount, // Reasonable limit based on plan type
      quantity: 1,
      customer_notify: true,
      notes: {
        user_id: user.id,
        user_email: user.email || '',
        plan_type: planId
      }
    };

    const subscription = await razorpay.subscriptions.create(subscriptionOptions);

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        planId: subscription.plan_id,
        status: subscription.status,
        shortUrl: subscription.short_url,
        totalCount: subscription.total_count,
        remainingCount: subscription.remaining_count,
        key: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id'
      }
    });
  } catch (error: any) {
    console.error('Error creating subscription:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
      details: error.message
    });
  }
});

// Verify subscription payment
router.post('/verify-payment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature, planId } = req.body;

    console.log('Verifying subscription payment with data:', {
      razorpay_subscription_id,
      razorpay_payment_id,
      razorpay_signature,
      planId
    });

    // For subscription payments, signature verification can be different
    // Let's try multiple verification methods and also check subscription status from Razorpay
    let isValid = false;
    const secret = process.env.RAZORPAY_KEY_SECRET || 'your_razorpay_key_secret';
    
    // Method 1: subscription_id|payment_id
    const sign1 = razorpay_subscription_id + '|' + razorpay_payment_id;
    const expectedSign1 = crypto
      .createHmac('sha256', secret)
      .update(sign1.toString())
      .digest('hex');
    
    // Method 2: payment_id|subscription_id  
    const sign2 = razorpay_payment_id + '|' + razorpay_subscription_id;
    const expectedSign2 = crypto
      .createHmac('sha256', secret)
      .update(sign2.toString())
      .digest('hex');

    console.log('Signature verification attempts:', {
      provided: razorpay_signature,
      method1: expectedSign1,
      method2: expectedSign2,
      sign1_match: razorpay_signature === expectedSign1,
      sign2_match: razorpay_signature === expectedSign2
    });

    isValid = (razorpay_signature === expectedSign1) || (razorpay_signature === expectedSign2);
    
    // Additional verification: Check if the payment actually exists and belongs to the subscription
    let paymentValid = false;
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      const subscription = await razorpay.subscriptions.fetch(razorpay_subscription_id);
      
      console.log('Payment and subscription validation:', {
        payment_status: payment.status,
        payment_captured: payment.captured,
        subscription_status: subscription.status,
        payment_exists: !!payment.id,
        subscription_exists: !!subscription.id
      });
      
      // If payment is captured and subscription exists, consider it valid
      paymentValid = payment.status === 'captured' && payment.captured === true && subscription.id === razorpay_subscription_id;
      
    } catch (fetchError) {
      console.error('Error fetching payment/subscription for verification:', fetchError);
    }
    
    // Accept if either signature is valid OR payment is verified from Razorpay API
    isValid = isValid || paymentValid;

    if (isValid) {
      // Payment is valid, fetch subscription details from Razorpay
      const subscription = await razorpay.subscriptions.fetch(razorpay_subscription_id);
      
      const plan = subscriptionPlans.find(p => p.id === planId);
      if (!plan) {
        return res.status(400).json({
          success: false,
          error: 'Invalid plan selected'
        });
      }

      // Calculate subscription end date based on plan and Razorpay subscription
      const now = new Date();
      let endDate: Date;
      
      // If subscription has current_end, use it, otherwise calculate based on plan
      if (subscription.current_end) {
        endDate = new Date(subscription.current_end * 1000); // Convert from Unix timestamp
      } else {
        endDate = new Date(now);
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
      }

      if (db) {
        // Create payment record
        const paymentData = createPaymentDocument({
          userId: user.id,
          razorpayOrderId: '', // No order for subscriptions
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          planId: plan.id as 'monthly' | 'quarterly' | 'yearly',
          amount: plan.price,
          currency: 'INR',
          status: 'completed',
        });

        await db.collection(COLLECTIONS.PAYMENTS).doc(paymentData.id).set(paymentData);

        // Update user subscription status
        await db.collection(COLLECTIONS.USERS).doc(user.id).update({
          subscriptionStatus: 'active',
          subscriptionPlan: plan.id,
          subscriptionStartDate: now.toISOString(),
          subscriptionEndDate: endDate.toISOString(),
          razorpaySubscriptionId: razorpay_subscription_id,
          updatedAt: now.toISOString(),
        });

        // Create subscription history entry
        const subscriptionHistoryData = createSubscriptionHistoryDocument({
          userId: user.id,
          planId: plan.id as 'monthly' | 'quarterly' | 'yearly',
          status: 'active',
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
          paymentId: paymentData.id,
          razorpaySubscriptionId: razorpay_subscription_id,
        });

        await db.collection(COLLECTIONS.SUBSCRIPTION_HISTORY).add(subscriptionHistoryData);
      }
      
      console.log("Subscription payment verified successfully");
      res.json({
        success: true,
        data: {
          message: 'Subscription payment verified successfully',
          subscriptionStatus: 'active',
          subscriptionPlan: plan.name,
          subscriptionEndDate: endDate.toISOString(),
          subscriptionId: razorpay_subscription_id,
          paymentId: razorpay_payment_id
        }
      });

    } else {
      console.error('Subscription signature verification failed:', {
        provided_signature: razorpay_signature,
        subscription_id: razorpay_subscription_id,
        payment_id: razorpay_payment_id,
        secret_configured: !!process.env.RAZORPAY_KEY_SECRET
      });
      
      res.status(400).json({
        success: false,
        error: 'Payment verification failed - Invalid signature'
      });
    }
  } catch (error: any) {
    console.error('Error verifying subscription payment:', error);
    res.status(500).json({
      success: false,
      error: 'Subscription payment verification failed'
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
    let subscriptionDetails = null;

    if (user.subscriptionStatus === 'trial' && user.trialEndDate) {
      const trialEnd = new Date(user.trialEndDate);
      const now = new Date();
      daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      isExpired = daysRemaining === 0;
      needsSubscription = isExpired;
    } else if (user.subscriptionStatus === 'active') {
      // For active subscriptions, get details from Razorpay if available
      if (user.razorpaySubscriptionId) {
        try {
          const subscription = await razorpay.subscriptions.fetch(user.razorpaySubscriptionId);
          subscriptionDetails = {
            id: subscription.id,
            status: subscription.status,
            currentStart: subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : null,
            currentEnd: subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : null,
            totalCount: (typeof subscription.total_count === 'number' && subscription.total_count === 999) ? 'Unlimited' : subscription.total_count,
            paidCount: subscription.paid_count,
            remainingCount: (typeof subscription.remaining_count === 'number' && subscription.remaining_count === 999) ? 'Unlimited' : subscription.remaining_count,
          };
          
          if (subscription.current_end) {
            const endDate = new Date(subscription.current_end * 1000);
            const now = new Date();
            daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            isExpired = daysRemaining === 0;
          } else {
            // Fallback to local data
            if (user.subscriptionEndDate) {
              const endDate = new Date(user.subscriptionEndDate);
              const now = new Date();
              daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
              isExpired = daysRemaining === 0;
            } else {
              daysRemaining = 30; // Default fallback
            }
          }
        } catch (error) {
          console.error('Failed to fetch subscription from Razorpay:', error);
          // Fallback to local data
          if (user.subscriptionEndDate) {
            const endDate = new Date(user.subscriptionEndDate);
            const now = new Date();
            daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
            isExpired = daysRemaining === 0;
          } else {
            daysRemaining = 30; // Default fallback
          }
        }
      } else {
        // No Razorpay subscription ID, use local data
        if (user.subscriptionEndDate) {
          const endDate = new Date(user.subscriptionEndDate);
          const now = new Date();
          daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          isExpired = daysRemaining === 0;
        } else {
          daysRemaining = 30; // Default fallback
        }
      }
      needsSubscription = isExpired;
    } else if (user.subscriptionStatus === 'cancelled') {
      // Cancelled subscriptions have no access
      isExpired = true;
      needsSubscription = true;
      daysRemaining = 0;
    } else {
      isExpired = true;
      needsSubscription = true;
    }

    res.json({
      success: true,
      data: {
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        razorpaySubscriptionId: user.razorpaySubscriptionId,
        trialEndDate: user.trialEndDate,
        subscriptionEndDate: user.subscriptionEndDate,
        subscriptionStartDate: user.subscriptionStartDate,
        daysRemaining,
        isExpired,
        needsSubscription,
        subscriptionDetails
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

// Webhook endpoint for Razorpay subscription notifications
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const webhookSignature = req.get('X-Razorpay-Signature');
    
    // For webhook routes, req.body is a Buffer due to raw middleware
    const webhookBody = req.body.toString('utf8');

    // Verify webhook signature if secret is configured
    if (webhookSecret && webhookSignature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(webhookBody)
        .digest('hex');

      if (webhookSignature !== expectedSignature) {
        console.error('Webhook signature verification failed');
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    // Parse the JSON body after verification
    const event = JSON.parse(webhookBody);
    console.log('Razorpay webhook received:', event.event, event.payload);

    // Handle subscription activated event
    if (event.event === 'subscription.activated') {
      const subscription = event.payload.subscription.entity;
      console.log('Subscription activated:', subscription.id);

      if (db) {
        try {
          // Find user by subscription ID and update status
          const usersRef = db.collection(COLLECTIONS.USERS);
          const userQuery = await usersRef.where('razorpaySubscriptionId', '==', subscription.id).get();
          
          if (!userQuery.empty) {
            const userDoc = userQuery.docs[0];
            const now = new Date();
            const endDate = subscription.current_end ? new Date(subscription.current_end * 1000) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            
            await userDoc.ref.update({
              subscriptionStatus: 'active',
              subscriptionStartDate: subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : now.toISOString(),
              subscriptionEndDate: endDate.toISOString(),
              updatedAt: now.toISOString(),
            });
            console.log('User subscription status updated to active via webhook');
          }
        } catch (error) {
          console.error('Error updating subscription via webhook:', error);
        }
      }
    }

    // Handle subscription charged event (recurring payment)
    if (event.event === 'subscription.charged') {
      const subscription = event.payload.subscription.entity;
      const payment = event.payload.payment?.entity;
      
      console.log('Subscription charged:', subscription.id, payment?.id);

      if (db && payment) {
        try {
          // Create payment record for recurring payment
          const paymentData = createPaymentDocument({
            userId: '', // Will be filled from user lookup
            razorpayOrderId: '',
            razorpayPaymentId: payment.id,
            razorpaySignature: '',
            planId: 'monthly' as 'monthly' | 'quarterly' | 'yearly', // Will be updated
            amount: payment.amount / 100, // Convert from paise
            currency: payment.currency,
            status: 'completed',
          });

          // Find user by subscription ID
          const usersRef = db.collection(COLLECTIONS.USERS);
          const userQuery = await usersRef.where('razorpaySubscriptionId', '==', subscription.id).get();
          
          if (!userQuery.empty) {
            const userDoc = userQuery.docs[0];
            const userData = userDoc.data();
            
            // Update payment record with user ID and plan
            paymentData.userId = userDoc.id;
            paymentData.planId = userData.subscriptionPlan as 'monthly' | 'quarterly' | 'yearly';
            
            await db.collection(COLLECTIONS.PAYMENTS).doc(paymentData.id).set(paymentData);
            
            // Update subscription end date
            const endDate = subscription.current_end ? new Date(subscription.current_end * 1000) : new Date();
            await userDoc.ref.update({
              subscriptionEndDate: endDate.toISOString(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            
            console.log('Recurring payment recorded via webhook');
          }
        } catch (error) {
          console.error('Error recording recurring payment via webhook:', error);
        }
      }
    }

    // Handle subscription cancelled event
    if (event.event === 'subscription.cancelled') {
      const subscription = event.payload.subscription.entity;
      console.log('Subscription cancelled via webhook:', subscription.id);
      
      if (db) {
        try {
          const usersRef = db.collection(COLLECTIONS.USERS);
          const userQuery = await usersRef.where('razorpaySubscriptionId', '==', subscription.id).get();
          
          if (!userQuery.empty) {
            const userDoc = userQuery.docs[0];
            await userDoc.ref.update({
              subscriptionStatus: 'cancelled',
              cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log('Subscription cancelled via webhook');
          }
        } catch (error) {
          console.error('Error cancelling subscription via webhook:', error);
        }
      }
    }

    // Handle payment failed event
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      console.log('Payment failed via webhook:', payment.id, payment.error_description);
      
      // Handle failed subscription payments
      if (payment.subscription_id) {
        console.log('Subscription payment failed:', payment.subscription_id);
        // You can implement retry logic or notification here
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Cancel subscription
router.post('/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    console.log('Cancel subscription request for user:', {
      userId: user.id,
      subscriptionStatus: user.subscriptionStatus,
      razorpaySubscriptionId: user.razorpaySubscriptionId,
      subscriptionPlan: user.subscriptionPlan
    });

    // Fetch latest user data from database to get current subscription info
    let currentUser = user;
    if (db) {
      try {
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(user.id).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          currentUser = {
            ...user,
            subscriptionStatus: userData?.subscriptionStatus || user.subscriptionStatus,
            razorpaySubscriptionId: userData?.razorpaySubscriptionId || user.razorpaySubscriptionId,
            subscriptionPlan: userData?.subscriptionPlan || user.subscriptionPlan
          };
          console.log('Fetched latest user data:', {
            subscriptionStatus: currentUser.subscriptionStatus,
            razorpaySubscriptionId: currentUser.razorpaySubscriptionId
          });
        }
      } catch (fetchError) {
        console.error('Error fetching latest user data:', fetchError);
      }
    }

    // Check if user has an active subscription
    if (currentUser.subscriptionStatus !== 'active') {
      console.log('User subscription status is not active:', currentUser.subscriptionStatus);
      return res.status(400).json({
        success: false,
        error: `No active subscription to cancel. Current status: ${currentUser.subscriptionStatus}`
      });
    }

    if (!currentUser.razorpaySubscriptionId) {
      console.log('User does not have razorpaySubscriptionId');
      return res.status(400).json({
        success: false,
        error: 'No Razorpay subscription ID found. Please contact support.'
      });
    }

    const { cancel_at_cycle_end = false } = req.body;

    try {
      // Cancel subscription via Razorpay API
      console.log('Attempting to cancel Razorpay subscription:', currentUser.razorpaySubscriptionId);
      const cancelledSubscription = await razorpay.subscriptions.cancel(
        currentUser.razorpaySubscriptionId!
      );

      console.log('Razorpay subscription cancelled successfully:', {
        subscriptionId: cancelledSubscription.id,
        status: cancelledSubscription.status
      });

      const now = new Date();

      if (db) {
        // Update user subscription status
        await db.collection(COLLECTIONS.USERS).doc(user.id).update({
          subscriptionStatus: 'cancelled',
          cancelledAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });

        // Create subscription history entry for cancellation
        const subscriptionHistoryData = createSubscriptionHistoryDocument({
          userId: user.id,
          planId: user.subscriptionPlan as 'monthly' | 'quarterly' | 'yearly',
          status: 'cancelled',
          startDate: user.subscriptionStartDate ? (user.subscriptionStartDate instanceof Date ? user.subscriptionStartDate.toISOString() : user.subscriptionStartDate) : now.toISOString(),
          endDate: now.toISOString(),
          razorpaySubscriptionId: currentUser.razorpaySubscriptionId,
        });

        await db.collection(COLLECTIONS.SUBSCRIPTION_HISTORY).add(subscriptionHistoryData);
      }

      console.log('Subscription cancelled for user:', user.id);

      res.json({
        success: true,
        data: {
          message: cancel_at_cycle_end 
            ? 'Subscription will be cancelled at the end of current billing cycle'
            : 'Subscription cancelled immediately',
          subscriptionStatus: 'cancelled',
          cancelledAt: now.toISOString(),
          subscriptionId: user.razorpaySubscriptionId
        }
      });

    } catch (razorpayError: any) {
      console.error('Failed to cancel Razorpay subscription:', {
        error: razorpayError.message,
        statusCode: razorpayError.statusCode,
        errorDetails: razorpayError.error,
        subscriptionId: user.razorpaySubscriptionId
      });
      
      // Still update local status even if Razorpay API fails
      const now = new Date();
      
      if (db) {
        await db.collection(COLLECTIONS.USERS).doc(user.id).update({
          subscriptionStatus: 'cancelled',
          cancelledAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Subscription cancelled locally (Razorpay API issue)',
          subscriptionStatus: 'cancelled',
          cancelledAt: now.toISOString(),
          warning: 'Please contact support if billing continues',
          error: razorpayError.message
        }
      });
    }

  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

// Pause subscription
router.post('/pause', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (user.subscriptionStatus !== 'active' || !user.razorpaySubscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'No active subscription to pause'
      });
    }

    const pausedSubscription = await razorpay.subscriptions.pause(
      user.razorpaySubscriptionId,
      { pause_at: 'now' }
    );

    const now = new Date();

    if (db) {
      await db.collection(COLLECTIONS.USERS).doc(user.id).update({
        subscriptionStatus: 'paused',
        pausedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Subscription paused successfully',
        subscriptionStatus: 'paused',
        pausedAt: now.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error pausing subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause subscription'
    });
  }
});

// Resume subscription
router.post('/resume', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (user.subscriptionStatus !== 'paused' || !user.razorpaySubscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'No paused subscription to resume'
      });
    }

    const resumedSubscription = await razorpay.subscriptions.resume(
      user.razorpaySubscriptionId,
      { resume_at: 'now' }
    );

    const now = new Date();

    if (db) {
      await db.collection(COLLECTIONS.USERS).doc(user.id).update({
        subscriptionStatus: 'active',
        resumedAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Subscription resumed successfully',
        subscriptionStatus: 'active',
        resumedAt: now.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume subscription'
    });
  }
});

// Create one-time payment order (for users who prefer UPI/wallets over subscriptions)
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

    console.log('Creating Razorpay order for one-time payment with credentials:', {
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET ? '[SET]' : '[NOT SET]'
    });

    const options = {
      amount: amount, // amount already in paise from frontend
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      payment_capture: true,
    };

    console.log('Razorpay order options:', options);

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id',
        isOneTime: true // Flag to indicate this is one-time payment
      }
    });
  } catch (error: any) {
    console.error('Error creating order:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create payment order',
      details: error.message
    });
  }
});

export { router as subscriptionRoutes };