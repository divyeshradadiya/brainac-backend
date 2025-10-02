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

    console.log('Creating Razorpay order with credentials:', {
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
        key: process.env.RAZORPAY_KEY_ID || 'your_razorpay_key_id'
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

    console.log('Verifying payment with data:', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId
    }
    )
    // Verify payment signature
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

      if (db) {
        // Create payment record
        const paymentData = createPaymentDocument({
          userId: user.id,
          razorpayOrderId: razorpay_order_id,
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
        });

        await db.collection(COLLECTIONS.SUBSCRIPTION_HISTORY).add(subscriptionHistoryData);
      }
      
      console.log( "suceed")
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
        subscriptionPlan: user.subscriptionPlan,
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

// Webhook endpoint for Razorpay payment notifications
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
    console.log('Razorpay webhook received:', event.event, event.payload?.payment?.entity?.id);

    // Handle payment success webhook
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const amount = payment.amount;
      const status = payment.status;

      console.log('Payment captured via webhook:', {
        orderId,
        paymentId,
        amount,
        status
      });

      // Update payment status in database if using Firestore
      if (db) {
        try {
          // Find and update payment record
          const paymentsRef = db.collection(COLLECTIONS.PAYMENTS);
          const paymentQuery = await paymentsRef.where('razorpayOrderId', '==', orderId).get();
          
          if (!paymentQuery.empty) {
            const paymentDoc = paymentQuery.docs[0];
            await paymentDoc.ref.update({
              status: 'captured',
              razorpayPaymentId: paymentId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              webhookProcessed: true
            });
            console.log('Payment record updated via webhook');
          }
        } catch (error) {
          console.error('Error updating payment via webhook:', error);
        }
      }
    }

    // Handle payment failure webhook
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      console.log('Payment failed via webhook:', payment.id, payment.error_description);
      
      // Update payment status in database
      if (db) {
        try {
          const paymentsRef = db.collection(COLLECTIONS.PAYMENTS);
          const paymentQuery = await paymentsRef.where('razorpayOrderId', '==', payment.order_id).get();
          
          if (!paymentQuery.empty) {
            const paymentDoc = paymentQuery.docs[0];
            await paymentDoc.ref.update({
              status: 'failed',
              errorDescription: payment.error_description,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              webhookProcessed: true
            });
          }
        } catch (error) {
          console.error('Error updating failed payment via webhook:', error);
        }
      }
    }

    res.status(200).json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
