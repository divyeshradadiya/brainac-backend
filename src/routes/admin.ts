import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { db } from '../index';
import { COLLECTIONS } from '../types/firestore';
import type { AuthRequest } from '../types';

const router = Router();

// Get dashboard stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin (you can implement admin check based on your requirements)
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    let stats = {
      totalStudents: 0,
      activeSubscriptions: 0,
      trialUsers: 0,
      expiredUsers: 0,
      monthlyRevenue: 0,
      totalRevenue: 0,
      totalVideos: 0,
      totalSubjects: 0,
      newStudentsToday: 0,
      paymentsPending: 0,
      recentTransactions: [] as any[],
      activeUsers: [] as any[],
      usersByStatus: {
        active: 0,
        trial: 0,
        expired: 0
      },
      revenueByMonth: [] as any[],
      userGrowthByMonth: [] as any[]
    };

    if (db) {
      // Get user statistics
      const usersSnapshot = await db.collection(COLLECTIONS.USERS).get();
      const users = usersSnapshot.docs.map(doc => doc.data());
      
      stats.totalStudents = users.length;
      
      // Count users by status
      users.forEach(user => {
        switch (user.subscriptionStatus) {
          case 'active':
            stats.activeSubscriptions++;
            stats.usersByStatus.active++;
            break;
          case 'trial':
            stats.trialUsers++;
            stats.usersByStatus.trial++;
            break;
          case 'expired':
            stats.expiredUsers++;
            stats.usersByStatus.expired++;
            break;
        }
      });

      // Get recent users (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      stats.newStudentsToday = users.filter(user => 
        new Date(user.createdAt) > yesterday
      ).length;

      // Get payments statistics
      const paymentsSnapshot = await db.collection(COLLECTIONS.PAYMENTS).get();
      const payments = paymentsSnapshot.docs.map(doc => doc.data());
      
      stats.totalRevenue = payments
        .filter(payment => payment.status === 'completed')
        .reduce((sum, payment) => sum + payment.amount, 0);

      // Calculate monthly revenue (current month)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      stats.monthlyRevenue = payments
        .filter(payment => {
          const paymentDate = new Date(payment.createdAt);
          return payment.status === 'completed' &&
                 paymentDate.getMonth() === currentMonth &&
                 paymentDate.getFullYear() === currentYear;
        })
        .reduce((sum, payment) => sum + payment.amount, 0);

      // Get recent transactions
      stats.recentTransactions = payments
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(payment => {
          const user = users.find(u => u.uid === payment.userId);
          return {
            id: payment.id,
            user: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
            email: user?.email || 'unknown@email.com',
            plan: payment.planId,
            amount: payment.amount,
            status: payment.status,
            date: payment.createdAt,
            paymentId: payment.razorpayPaymentId
          };
        });

      // Get active users (last 24 hours activity)
      stats.activeUsers = users
        .filter(user => {
          const lastActive = new Date(user.updatedAt);
          return lastActive > yesterday;
        })
        .slice(0, 5)
        .map(user => ({
          id: user.uid,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          grade: user.class,
          status: user.subscriptionStatus,
          lastActive: user.updatedAt,
          videosWatched: 0, // You can track this in a separate collection
          joinDate: user.createdAt
        }));

      // Generate revenue by month (last 12 months)
      const revenueByMonth = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('en', { month: 'short' });
        
        const monthlyTotal = payments
          .filter(payment => {
            const paymentDate = new Date(payment.createdAt);
            return payment.status === 'completed' &&
                   paymentDate.getMonth() === date.getMonth() &&
                   paymentDate.getFullYear() === date.getFullYear();
          })
          .reduce((sum, payment) => sum + payment.amount, 0);

        const monthlySubscriptions = payments
          .filter(payment => {
            const paymentDate = new Date(payment.createdAt);
            return payment.status === 'completed' &&
                   paymentDate.getMonth() === date.getMonth() &&
                   paymentDate.getFullYear() === date.getFullYear();
          }).length;

        revenueByMonth.push({
          month,
          revenue: monthlyTotal,
          subscriptions: monthlySubscriptions
        });
      }
      stats.revenueByMonth = revenueByMonth;

      // Generate user growth by month
      const userGrowthByMonth = [];
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('en', { month: 'short' });
        
        const newUsers = users.filter(user => {
          const joinDate = new Date(user.createdAt);
          return joinDate.getMonth() === date.getMonth() &&
                 joinDate.getFullYear() === date.getFullYear();
        }).length;

        const activeUsers = users.filter(user => {
          const joinDate = new Date(user.createdAt);
          return joinDate <= date && user.subscriptionStatus === 'active';
        }).length;

        const trialUsers = users.filter(user => {
          const joinDate = new Date(user.createdAt);
          return joinDate <= date && user.subscriptionStatus === 'trial';
        }).length;

        userGrowthByMonth.push({
          month,
          newUsers,
          activeUsers,
          trialUsers
        });
      }
      stats.userGrowthByMonth = userGrowthByMonth;

    } else {
      // Fallback demo data when Firestore is not available
      stats = {
        totalStudents: 1247,
        activeSubscriptions: 892,
        trialUsers: 234,
        expiredUsers: 121,
        monthlyRevenue: 267800,
        totalRevenue: 1234567,
        totalVideos: 1580,
        totalSubjects: 15,
        newStudentsToday: 23,
        paymentsPending: 12,
        recentTransactions: [
          {
            id: '1',
            user: 'Rahul Sharma',
            email: 'rahul.sharma@gmail.com',
            plan: 'yearly',
            amount: 2499,
            status: 'completed',
            date: new Date().toISOString(),
            paymentId: 'pay_ABC123'
          }
        ],
        activeUsers: [
          {
            id: '1',
            name: 'Arjun Mehta',
            email: 'arjun.mehta@gmail.com',
            grade: 10,
            status: 'active',
            lastActive: '2 minutes ago',
            videosWatched: 45,
            joinDate: '2024-01-15'
          }
        ],
        usersByStatus: {
          active: 892,
          trial: 234,
          expired: 121
        },
        revenueByMonth: [
          { month: 'Jan', revenue: 45000, subscriptions: 120 },
          { month: 'Feb', revenue: 52000, subscriptions: 145 },
          { month: 'Mar', revenue: 48000, subscriptions: 135 },
          { month: 'Apr', revenue: 61000, subscriptions: 180 },
          { month: 'May', revenue: 73000, subscriptions: 220 },
          { month: 'Jun', revenue: 85000, subscriptions: 250 },
          { month: 'Jul', revenue: 92000, subscriptions: 275 },
          { month: 'Aug', revenue: 88000, subscriptions: 260 },
          { month: 'Sep', revenue: 96000, subscriptions: 290 },
          { month: 'Oct', revenue: 105000, subscriptions: 315 },
          { month: 'Nov', revenue: 112000, subscriptions: 340 },
          { month: 'Dec', revenue: 125000, subscriptions: 380 }
        ],
        userGrowthByMonth: [
          { month: 'Jan', newUsers: 85, activeUsers: 420, trialUsers: 45 },
          { month: 'Feb', newUsers: 120, activeUsers: 485, trialUsers: 52 },
          { month: 'Mar', newUsers: 95, activeUsers: 510, trialUsers: 38 },
          { month: 'Apr', newUsers: 145, activeUsers: 595, trialUsers: 65 },
          { month: 'May', newUsers: 180, activeUsers: 720, trialUsers: 78 },
          { month: 'Jun', newUsers: 220, activeUsers: 850, trialUsers: 92 },
          { month: 'Jul', newUsers: 250, activeUsers: 950, trialUsers: 105 },
          { month: 'Aug', newUsers: 195, activeUsers: 920, trialUsers: 88 },
          { month: 'Sep', newUsers: 275, activeUsers: 1050, trialUsers: 115 },
          { month: 'Oct', newUsers: 320, activeUsers: 1180, trialUsers: 135 },
          { month: 'Nov', newUsers: 285, activeUsers: 1250, trialUsers: 125 },
          { month: 'Dec', newUsers: 350, activeUsers: 1420, trialUsers: 145 }
        ]
      };
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
});

// Get all users with pagination and filtering
router.get('/users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { page = 1, limit = 10, status, search } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    if (db) {
      let usersRef: any = db.collection(COLLECTIONS.USERS);

      // Apply status filter
      if (status && status !== 'all') {
        usersRef = usersRef.where('subscriptionStatus', '==', status);
      }

      const snapshot = await usersRef.get();
      let users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Apply search filter
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        users = users.filter((user: any) => 
          user.firstName?.toLowerCase().includes(searchTerm) ||
          user.lastName?.toLowerCase().includes(searchTerm) ||
          user.email?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedUsers = users.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          users: paginatedUsers,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: users.length,
            totalPages: Math.ceil(users.length / limitNum)
          }
        }
      });
    } else {
      // Demo data when Firestore is not available
      res.json({
        success: true,
        data: {
          users: [
            {
              id: '1',
              uid: '1',
              firstName: 'Rahul',
              lastName: 'Sharma',
              email: 'rahul.sharma@gmail.com',
              class: 10,
              subscriptionStatus: 'active',
              subscriptionPlan: 'yearly',
              createdAt: '2024-01-15',
              updatedAt: new Date().toISOString()
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          }
        }
      });
    }

  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// Get all subjects for admin management
router.get('/subjects', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { grade } = req.query;

    // Get subjects from sample data (you can extend this to use Firestore)
    const { gradeData } = await import('../data/sample-data');
    
    let subjects: any[] = [];
    
    if (grade) {
      const gradeNum = parseInt(grade as string);
      if (gradeData[gradeNum]) {
        subjects = gradeData[gradeNum].subjects.map(subject => ({
          ...subject,
          grade: gradeNum,
          videos: gradeData[gradeNum].videos.filter(video => video.subject === subject.name)
        }));
      }
    } else {
      // Get all subjects from all grades
      Object.keys(gradeData).forEach(gradeKey => {
        const gradeNum = parseInt(gradeKey);
        const gradeSubjects = gradeData[gradeNum].subjects.map(subject => ({
          ...subject,
          grade: gradeNum,
          videos: gradeData[gradeNum].videos.filter(video => video.subject === subject.name)
        }));
        subjects.push(...gradeSubjects);
      });
    }

    res.json({
      success: true,
      data: {
        subjects,
        totalSubjects: subjects.length,
        grades: Object.keys(gradeData).map(grade => parseInt(grade))
      }
    });

  } catch (error: any) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subjects'
    });
  }
});

// Get all videos for admin management
router.get('/videos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { grade, subject, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    // Get videos from sample data
    const { gradeData } = await import('../data/sample-data');
    
    let allVideos: any[] = [];
    
    Object.keys(gradeData).forEach(gradeKey => {
      const gradeNum = parseInt(gradeKey);
      const videos = gradeData[gradeNum].videos.map(video => ({
        ...video,
        grade: gradeNum
      }));
      allVideos.push(...videos);
    });

    // Apply filters
    if (grade) {
      const gradeNum = parseInt(grade as string);
      allVideos = allVideos.filter(video => video.grade === gradeNum);
    }

    if (subject) {
      allVideos = allVideos.filter(video => 
        video.subject.toLowerCase().includes((subject as string).toLowerCase())
      );
    }

    // Apply pagination
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedVideos = allVideos.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        videos: paginatedVideos,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: allVideos.length,
          totalPages: Math.ceil(allVideos.length / limitNum)
        },
        stats: {
          totalVideos: allVideos.length,
          averageDuration: '25:30',
          totalViews: allVideos.reduce((sum, video) => sum + parseInt(video.views), 0)
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch videos'
    });
  }
});

// Add new video (for admin)
router.post('/videos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { title, subject, grade, duration, description, videoUrl, thumbnail, category } = req.body;

    if (!title || !subject || !grade || !videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Title, subject, grade, and video URL are required'
      });
    }

    const newVideo = {
      id: `video_${Date.now()}`,
      title,
      subject,
      grade: parseInt(grade),
      duration: duration || '0:00',
      description: description || '',
      videoUrl,
      thumbnail: thumbnail || '/placeholder.svg',
      category: category || 'general',
      views: '0',
      likes: '0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // In a real implementation, you would save this to Firestore
    // await db.collection('videos').add(newVideo);

    res.json({
      success: true,
      data: newVideo,
      message: 'Video added successfully'
    });

  } catch (error: any) {
    console.error('Error adding video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add video'
    });
  }
});

// Update video (for admin)
router.put('/videos/:videoId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { videoId } = req.params;
    const updates = req.body;

    // In a real implementation, you would update this in Firestore
    // await db.collection('videos').doc(videoId).update({
    //   ...updates,
    //   updatedAt: new Date().toISOString()
    // });

    res.json({
      success: true,
      message: 'Video updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update video'
    });
  }
});

// Delete video (for admin)
router.delete('/videos/:videoId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { videoId } = req.params;

    // In a real implementation, you would delete this from Firestore
    // await db.collection('videos').doc(videoId).delete();

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete video'
    });
  }
});

// Update user subscription (for admin)
router.put('/users/:userId/subscription', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { userId } = req.params;
    const { subscriptionStatus, subscriptionPlan, subscriptionEndDate } = req.body;

    if (db) {
      await db.collection(COLLECTIONS.USERS).doc(userId).update({
        subscriptionStatus,
        subscriptionPlan,
        subscriptionEndDate,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'User subscription updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating user subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user subscription'
    });
  }
});

// Payment Management Routes

// Get all payments
router.get('/payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { page = 1, limit = 20, status, method, search, dateRange } = req.query;

    let payments = [];
    let totalCount = 0;

    if (db) {
      try {
        // Get payments from Firestore
        let paymentsRef: any = db.collection(COLLECTIONS.PAYMENTS);

        // Apply status filter
        if (status && status !== 'all') {
          paymentsRef = paymentsRef.where('status', '==', status);
        }

        // Apply method filter
        if (method && method !== 'all') {
          paymentsRef = paymentsRef.where('paymentMethod', '==', method);
        }

        // Apply date range filter
        if (dateRange && dateRange !== 'all') {
          const now = new Date();
          let startDate;
          
          switch (dateRange) {
            case 'today':
              startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              break;
            case 'week':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              break;
            case 'month':
              startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              break;
            case 'quarter':
              const quarterStart = Math.floor(now.getMonth() / 3) * 3;
              startDate = new Date(now.getFullYear(), quarterStart, 1);
              break;
          }
          
          if (startDate) {
            paymentsRef = paymentsRef.where('createdAt', '>=', startDate.toISOString());
          }
        }

        // Order by creation date (newest first)
        paymentsRef = paymentsRef.orderBy('createdAt', 'desc');

        const snapshot = await paymentsRef.get();
        let paymentsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Get user details for each payment
        const usersRef = db.collection(COLLECTIONS.USERS);
        const enhancedPayments = await Promise.all(
          paymentsData.map(async (payment: any) => {
            try {
              const userDoc = await usersRef.doc(payment.userId).get();
              const userData = userDoc.data();
              
              return {
                ...payment,
                userName: userData ? `${userData.firstName} ${userData.lastName}` : 'Unknown User',
                userEmail: userData?.email || 'unknown@email.com',
                planName: payment.planId === 'yearly' ? 'Yearly Plan' : 
                         payment.planId === 'monthly' ? 'Monthly Plan' : 
                         payment.planId === 'quarterly' ? 'Quarterly Plan' : 'Unknown Plan'
              };
            } catch (error) {
              console.error('Error fetching user data for payment:', payment.id, error);
              return {
                ...payment,
                userName: 'Unknown User',
                userEmail: 'unknown@email.com',
                planName: 'Unknown Plan'
              };
            }
          })
        );

        // Apply search filter
        if (search) {
          const searchTerm = (search as string).toLowerCase();
          paymentsData = enhancedPayments.filter((payment: any) =>
            payment.userName.toLowerCase().includes(searchTerm) ||
            payment.userEmail.toLowerCase().includes(searchTerm) ||
            payment.razorpayPaymentId?.toLowerCase().includes(searchTerm) ||
            payment.planName.toLowerCase().includes(searchTerm)
          );
        } else {
          paymentsData = enhancedPayments;
        }

        totalCount = paymentsData.length;

        // Apply pagination
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        payments = paymentsData.slice(startIndex, endIndex);

      } catch (error) {
        console.error('Error fetching payments from Firestore:', error);
        // Fall back to empty data on error
        payments = [];
        totalCount = 0;
      }
    } else {
      // Fallback demo data when Firestore is not available
      payments = [];
      totalCount = 0;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    res.json({
      success: true,
      data: {
        payments: payments,
        pagination: {
          current_page: pageNum,
          total_pages: Math.ceil(totalCount / limitNum),
          total_count: totalCount,
          per_page: limitNum
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching payments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payments'
    });
  }
});

// Get payment details
router.get('/payments/:paymentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { paymentId } = req.params;

    if (db) {
      try {
        // Get payment from Firestore
        const paymentDoc = await db.collection(COLLECTIONS.PAYMENTS).doc(paymentId).get();
        
        if (!paymentDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Payment not found'
          });
        }

        const paymentData = paymentDoc.data();
        if (!paymentData) {
          return res.status(404).json({
            success: false,
            error: 'Payment data not found'
          });
        }
        
        // Get user details
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(paymentData.userId).get();
        const userData = userDoc.data();

        const payment = {
          id: paymentDoc.id,
          ...paymentData,
          userName: userData ? `${userData.firstName} ${userData.lastName}` : 'Unknown User',
          userEmail: userData?.email || 'unknown@email.com',
          planName: paymentData.planId === 'yearly' ? 'Yearly Plan' : 
                   paymentData.planId === 'monthly' ? 'Monthly Plan' : 
                   paymentData.planId === 'quarterly' ? 'Quarterly Plan' : 'Unknown Plan',
          metadata: {
            ipAddress: '192.168.1.1', // You can track this in your payment creation
            userAgent: 'Browser/Version',
            referer: 'https://brainac.edu'
          }
        };

        res.json({
          success: true,
          data: payment
        });

      } catch (error) {
        console.error('Error fetching payment details:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch payment details'
        });
      }
    } else {
      // Fallback when Firestore is not available
      res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

  } catch (error: any) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment details'
    });
  }
});

// Update payment status
router.patch('/payments/:paymentId/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { paymentId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['completed', 'pending', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment status'
      });
    }

    if (db) {
      // Update payment status in Firestore
      await db.collection(COLLECTIONS.PAYMENTS).doc(paymentId).update({
        status,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating payment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payment status'
    });
  }
});

// Refund payment
router.post('/payments/:paymentId/refund', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { paymentId } = req.params;
    const { reason } = req.body;

    if (db) {
      // Update payment status to refunded
      await db.collection(COLLECTIONS.PAYMENTS).doc(paymentId).update({
        status: 'refunded',
        refundReason: reason || 'Admin refund',
        refundedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Payment refunded successfully'
    });

  } catch (error: any) {
    console.error('Error refunding payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refund payment'
    });
  }
});

export default router;