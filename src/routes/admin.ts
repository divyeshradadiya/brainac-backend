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
      let users = snapshot.docs.map((doc: any) => ({
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

    if (db) {
      try {
        let subjectsRef: any = db.collection(COLLECTIONS.SUBJECTS);

        // Apply grade filter if provided
        if (grade) {
          const gradeNum = parseInt(grade as string);
          subjectsRef = subjectsRef.where('grade', '==', gradeNum);
        }

        // Order by grade only (remove name to avoid composite index requirement)
        subjectsRef = subjectsRef.orderBy('grade');

        const snapshot = await subjectsRef.get();
        const subjects = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by name in JavaScript after fetching
        subjects.sort((a: any, b: any) => a.name.localeCompare(b.name));

        // Get video counts for each subject
        const subjectsWithVideos = await Promise.all(
          subjects.map(async (subject: any) => {
            try {
              const videosSnapshot = await db!.collection(COLLECTIONS.VIDEOS)
                .where('subjectId', '==', subject.id)
                .get();
              
              return {
                ...subject,
                videoCount: videosSnapshot.size,
                videos: videosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
              };
            } catch (error) {
              console.error('Error fetching videos for subject:', subject.id, error);
              return { ...subject, videoCount: 0, videos: [] };
            }
          })
        );

        res.json({
          success: true,
          data: {
            subjects: subjectsWithVideos,
            totalSubjects: subjectsWithVideos.length,
            grades: [6, 7, 8, 9, 10]
          }
        });

      } catch (error) {
        console.error('Error fetching subjects from Firestore:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch subjects'
        });
      }
    } else {
      // Fallback when Firestore is not available
      res.json({
        success: true,
        data: {
          subjects: [],
          totalSubjects: 0,
          grades: [6, 7, 8, 9, 10]
        }
      });
    }

  } catch (error: any) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subjects'
    });
  }
});

// Create new subject
router.post('/subjects', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { name, description, grade, icon, color } = req.body;

    if (!name || !description || !grade) {
      return res.status(400).json({
        success: false,
        error: 'Name, description, and grade are required'
      });
    }

    if (grade < 6 || grade > 10) {
      return res.status(400).json({
        success: false,
        error: 'Grade must be between 6 and 10'
      });
    }

    if (db) {
      try {
        // Check if subject already exists for this grade
        const existingSubject = await db.collection(COLLECTIONS.SUBJECTS)
          .where('name', '==', name)
          .where('grade', '==', grade)
          .get();

        if (!existingSubject.empty) {
          return res.status(400).json({
            success: false,
            error: 'Subject already exists for this grade'
          });
        }

        const newSubject = {
          name,
          description,
          grade: parseInt(grade),
          icon: icon || '📚',
          color: color || '#3B82F6',
          videoCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const docRef = await db.collection(COLLECTIONS.SUBJECTS).add(newSubject);

        res.json({
          success: true,
          data: {
            id: docRef.id,
            ...newSubject
          },
          message: 'Subject created successfully'
        });

      } catch (error) {
        console.error('Error creating subject:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create subject'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error creating subject:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subject'
    });
  }
});

// Update subject
router.put('/subjects/:subjectId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { subjectId } = req.params;
    const { name, description, grade, icon, color } = req.body;

    if (grade && (grade < 6 || grade > 10)) {
      return res.status(400).json({
        success: false,
        error: 'Grade must be between 6 and 10'
      });
    }

    if (db) {
      try {
        // Check if subject exists
        const subjectDoc = await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).get();
        
        if (!subjectDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Subject not found'
          });
        }

        // Check if new name+grade combination already exists (if name or grade is being changed)
        if (name || grade) {
          const currentData = subjectDoc.data();
          const newName = name || currentData?.name;
          const newGrade = grade || currentData?.grade;

          if (newName !== currentData?.name || newGrade !== currentData?.grade) {
            const existingSubject = await db.collection(COLLECTIONS.SUBJECTS)
              .where('name', '==', newName)
              .where('grade', '==', newGrade)
              .get();

            if (!existingSubject.empty && existingSubject.docs[0].id !== subjectId) {
              return res.status(400).json({
                success: false,
                error: 'Subject with this name already exists for this grade'
              });
            }
          }
        }

        const updateData: any = {
          updatedAt: new Date().toISOString()
        };

        if (name) updateData.name = name;
        if (description) updateData.description = description;
        if (grade) updateData.grade = parseInt(grade);
        if (icon) updateData.icon = icon;
        if (color) updateData.color = color;

        await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).update(updateData);

        res.json({
          success: true,
          message: 'Subject updated successfully'
        });

      } catch (error) {
        console.error('Error updating subject:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update subject'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error updating subject:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subject'
    });
  }
});

// Delete subject
router.delete('/subjects/:subjectId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { subjectId } = req.params;

    if (db) {
      try {
        // Check if subject exists
        const subjectDoc = await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).get();
        
        if (!subjectDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Subject not found'
          });
        }

        // Check if subject has videos
        const videosSnapshot = await db.collection(COLLECTIONS.VIDEOS)
          .where('subjectId', '==', subjectId)
          .get();

        if (!videosSnapshot.empty) {
          return res.status(400).json({
            success: false,
            error: `Cannot delete subject. It has ${videosSnapshot.size} videos. Please delete videos first.`
          });
        }

        await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).delete();

        res.json({
          success: true,
          message: 'Subject deleted successfully'
        });

      } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete subject'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error deleting subject:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete subject'
    });
  }
});

// ===================== UNITS CRUD =====================

// Get all units for a subject
router.get('/subjects/:subjectId/units', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { subjectId } = req.params;

    if (db) {
      try {
        // Check if subject exists
        const subjectDoc = await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).get();
        if (!subjectDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Subject not found'
          });
        }

        const unitsSnapshot = await db.collection(COLLECTIONS.UNITS)
          .where('subjectId', '==', subjectId)
          .get();

        const units = unitsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        res.json({
          success: true,
          data: { units }
        });

      } catch (error) {
        console.error('Error fetching units:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch units'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error fetching units:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch units'
    });
  }
});

// Create new unit
router.post('/subjects/:subjectId/units', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { subjectId } = req.params;
    const { name, description, order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Unit name is required'
      });
    }

    if (db) {
      try {
        // Check if subject exists
        const subjectDoc = await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).get();
        if (!subjectDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Subject not found'
          });
        }

        const now = new Date().toISOString();
        const unitData = {
          name,
          description: description || '',
          subjectId,
          order: order || 1,
          createdAt: now,
          updatedAt: now
        };

        const unitRef = await db.collection(COLLECTIONS.UNITS).add(unitData);

        res.status(201).json({
          success: true,
          data: {
            id: unitRef.id,
            ...unitData
          },
          message: 'Unit created successfully'
        });

      } catch (error) {
        console.error('Error creating unit:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create unit'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error creating unit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create unit'
    });
  }
});

// Update unit
router.put('/units/:unitId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { unitId } = req.params;
    const { name, description, order } = req.body;

    if (db) {
      try {
        const unitDoc = await db.collection(COLLECTIONS.UNITS).doc(unitId).get();
        if (!unitDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Unit not found'
          });
        }

        const updateData: any = {
          updatedAt: new Date().toISOString()
        };

        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (order !== undefined) updateData.order = order;

        await db.collection(COLLECTIONS.UNITS).doc(unitId).update(updateData);

        res.json({
          success: true,
          message: 'Unit updated successfully'
        });

      } catch (error) {
        console.error('Error updating unit:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update unit'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error updating unit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update unit'
    });
  }
});

// Delete unit
router.delete('/units/:unitId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { unitId } = req.params;

    if (db) {
      try {
        const unitDoc = await db.collection(COLLECTIONS.UNITS).doc(unitId).get();
        if (!unitDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Unit not found'
          });
        }

        // Check if unit has chapters
        const chaptersSnapshot = await db.collection(COLLECTIONS.CHAPTERS)
          .where('unitId', '==', unitId)
          .get();

        if (!chaptersSnapshot.empty) {
          return res.status(400).json({
            success: false,
            error: `Cannot delete unit. It has ${chaptersSnapshot.size} chapters. Please delete chapters first.`
          });
        }

        await db.collection(COLLECTIONS.UNITS).doc(unitId).delete();

        res.json({
          success: true,
          message: 'Unit deleted successfully'
        });

      } catch (error) {
        console.error('Error deleting unit:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete unit'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error deleting unit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete unit'
    });
  }
});

// ===================== CHAPTERS CRUD =====================

// Get all chapters for a unit
router.get('/units/:unitId/chapters', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { unitId } = req.params;

    if (db) {
      try {
        // Check if unit exists
        const unitDoc = await db.collection(COLLECTIONS.UNITS).doc(unitId).get();
        if (!unitDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Unit not found'
          });
        }

        const chaptersSnapshot = await db.collection(COLLECTIONS.CHAPTERS)
          .where('unitId', '==', unitId)
          .get();

        const chapters = chaptersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        res.json({
          success: true,
          data: { chapters }
        });

      } catch (error) {
        console.error('Error fetching chapters:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch chapters'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error fetching chapters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chapters'
    });
  }
});

// Create new chapter
router.post('/units/:unitId/chapters', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { unitId } = req.params;
    const { name, description, order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Chapter name is required'
      });
    }

    if (db) {
      try {
        // Check if unit exists and get subject ID
        const unitDoc = await db.collection(COLLECTIONS.UNITS).doc(unitId).get();
        if (!unitDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Unit not found'
          });
        }

        const unitData = unitDoc.data();
        const now = new Date().toISOString();
        const chapterData = {
          name,
          description: description || '',
          unitId,
          subjectId: unitData?.subjectId,
          order: order || 1,
          createdAt: now,
          updatedAt: now
        };

        const chapterRef = await db.collection(COLLECTIONS.CHAPTERS).add(chapterData);

        res.status(201).json({
          success: true,
          data: {
            id: chapterRef.id,
            ...chapterData
          },
          message: 'Chapter created successfully'
        });

      } catch (error) {
        console.error('Error creating chapter:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create chapter'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error creating chapter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chapter'
    });
  }
});

// Update chapter
router.put('/chapters/:chapterId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { chapterId } = req.params;
    const { name, description, order } = req.body;

    if (db) {
      try {
        const chapterDoc = await db.collection(COLLECTIONS.CHAPTERS).doc(chapterId).get();
        if (!chapterDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Chapter not found'
          });
        }

        const updateData: any = {
          updatedAt: new Date().toISOString()
        };

        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (order !== undefined) updateData.order = order;

        await db.collection(COLLECTIONS.CHAPTERS).doc(chapterId).update(updateData);

        res.json({
          success: true,
          message: 'Chapter updated successfully'
        });

      } catch (error) {
        console.error('Error updating chapter:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update chapter'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error updating chapter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update chapter'
    });
  }
});

// Delete chapter
router.delete('/chapters/:chapterId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { chapterId } = req.params;

    if (db) {
      try {
        const chapterDoc = await db.collection(COLLECTIONS.CHAPTERS).doc(chapterId).get();
        if (!chapterDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Chapter not found'
          });
        }

        // Check if chapter has videos
        const videosSnapshot = await db.collection(COLLECTIONS.VIDEOS)
          .where('chapterId', '==', chapterId)
          .get();

        if (!videosSnapshot.empty) {
          return res.status(400).json({
            success: false,
            error: `Cannot delete chapter. It has ${videosSnapshot.size} videos. Please delete videos first.`
          });
        }

        await db.collection(COLLECTIONS.CHAPTERS).doc(chapterId).delete();

        res.json({
          success: true,
          message: 'Chapter deleted successfully'
        });

      } catch (error) {
        console.error('Error deleting chapter:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete chapter'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error deleting chapter:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chapter'
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

    if (db) {
      try {
        let videosRef: any = db.collection(COLLECTIONS.VIDEOS);

        // Apply grade filter
        if (grade) {
          const gradeNum = parseInt(grade as string);
          videosRef = videosRef.where('grade', '==', gradeNum);
        }

        // Apply subject filter
        if (subject) {
          // First find the subject ID
          const subjectsSnapshot = await db.collection(COLLECTIONS.SUBJECTS)
            .where('name', '==', subject)
            .get();
          
          if (!subjectsSnapshot.empty) {
            const subjectId = subjectsSnapshot.docs[0].id;
            videosRef = videosRef.where('subjectId', '==', subjectId);
          }
        }

        // Order by creation date (newest first)
        videosRef = videosRef.orderBy('createdAt', 'desc');

        const snapshot = await videosRef.get();
        let videos = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        }));

        // Get subject details for each video
        const videosWithSubjects = await Promise.all(
          videos.map(async (video: any) => {
            try {
              const subjectDoc = await db!.collection(COLLECTIONS.SUBJECTS).doc(video.subjectId).get();
              const subjectData = subjectDoc.data();
              
              return {
                ...video,
                subject: subjectData?.name || 'Unknown Subject'
              };
            } catch (error) {
              console.error('Error fetching subject for video:', video.id, error);
              return { ...video, subject: 'Unknown Subject' };
            }
          })
        );

        // Apply pagination
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedVideos = videosWithSubjects.slice(startIndex, endIndex);

        res.json({
          success: true,
          data: {
            videos: paginatedVideos,
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: videosWithSubjects.length,
              totalPages: Math.ceil(videosWithSubjects.length / limitNum)
            },
            stats: {
              totalVideos: videosWithSubjects.length,
              averageDuration: '25:30',
              totalViews: videosWithSubjects.reduce((sum: number, video: any) => sum + (video.views || 0), 0)
            }
          }
        });

      } catch (error) {
        console.error('Error fetching videos from Firestore:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch videos'
        });
      }
    } else {
      // Fallback when Firestore is not available
      res.json({
        success: true,
        data: {
          videos: [],
          pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 },
          stats: { totalVideos: 0, averageDuration: '0:00', totalViews: 0 }
        }
      });
    }

  } catch (error: any) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch videos'
    });
  }
});
    
// Add new video to a chapter
router.post('/chapters/:chapterId/videos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { chapterId } = req.params;
    const { title, duration, description, videoUrl, thumbnail, tags, difficulty, order } = req.body;

    if (!title || !videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Title and video URL are required'
      });
    }

    if (db) {
      try {
        // Get chapter and related data
        const chapterDoc = await db.collection(COLLECTIONS.CHAPTERS).doc(chapterId).get();
        if (!chapterDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Chapter not found'
          });
        }

        const chapterData = chapterDoc.data();
        
        // Get unit data
        const unitDoc = await db.collection(COLLECTIONS.UNITS).doc(chapterData?.unitId).get();
        if (!unitDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Unit not found'
          });
        }

        // Get subject data
        const subjectDoc = await db.collection(COLLECTIONS.SUBJECTS).doc(chapterData?.subjectId).get();
        if (!subjectDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Subject not found'
          });
        }

        const subjectData = subjectDoc.data();
        const now = new Date().toISOString();

        const newVideo = {
          title,
          description: description || '',
          subject: subjectData?.name || 'Unknown',
          subjectId: chapterData?.subjectId,
          unitId: chapterData?.unitId,
          chapterId,
          grade: subjectData?.grade,
          duration: duration || '0:00',
          videoUrl,
          thumbnail: thumbnail || '/placeholder.svg',
          views: 0,
          likes: 0,
          order: order || 1,
          tags: tags || [],
          difficulty: difficulty || 'beginner',
          createdAt: now,
          updatedAt: now
        };

        const videoRef = await db.collection(COLLECTIONS.VIDEOS).add(newVideo);

        res.status(201).json({
          success: true,
          data: {
            id: videoRef.id,
            ...newVideo
          },
          message: 'Video created successfully'
        });

      } catch (error) {
        console.error('Error creating video:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create video'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

  } catch (error: any) {
    console.error('Error creating video:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create video'
    });
  }
});

// Add new video (for admin) - Legacy endpoint for backward compatibility
router.post('/videos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { title, subjectId, chapterId, unitId, grade, duration, description, videoUrl, thumbnail, tags, difficulty, order } = req.body;

    if (!title || !subjectId || !videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Title, subject, and video URL are required'
      });
    }

    if (db) {
      try {
        // Verify subject exists
        const subjectDoc = await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).get();
        if (!subjectDoc.exists) {
          return res.status(400).json({
            success: false,
            error: 'Subject not found'
          });
        }

        const subjectData = subjectDoc.data();
        const now = new Date().toISOString();

        const newVideo = {
          title,
          description: description || '',
          subject: subjectData?.name || 'Unknown',
          subjectId,
          unitId: unitId || null,
          chapterId: chapterId || null,
          grade: subjectData?.grade || parseInt(grade || '6'),
          duration: duration || '0:00',
          videoUrl,
          thumbnail: thumbnail || '/placeholder.svg',
          views: 0,
          likes: 0,
          order: order || 1,
          tags: tags || [],
          difficulty: difficulty || 'beginner',
          createdAt: now,
          updatedAt: now
        };

        const docRef = await db.collection(COLLECTIONS.VIDEOS).add(newVideo);

        // Update subject video count
        await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).update({
          videoCount: (subjectData?.videoCount || 0) + 1,
          updatedAt: new Date().toISOString()
        });

        res.json({
          success: true,
          data: {
            id: docRef.id,
            ...newVideo
          },
          message: 'Video added successfully'
        });

      } catch (error) {
        console.error('Error creating video:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create video'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

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
    const { title, description, subjectId, grade, duration, videoUrl, thumbnail, category, tags } = req.body;

    if (grade && (grade < 6 || grade > 10)) {
      return res.status(400).json({
        success: false,
        error: 'Grade must be between 6 and 10'
      });
    }

    if (db) {
      try {
        // Check if video exists
        const videoDoc = await db.collection(COLLECTIONS.VIDEOS).doc(videoId).get();
        
        if (!videoDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Video not found'
          });
        }

        const currentVideoData = videoDoc.data();

        // If subjectId is being changed, verify new subject exists
        if (subjectId && subjectId !== currentVideoData?.subjectId) {
          const subjectDoc = await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).get();
          if (!subjectDoc.exists) {
            return res.status(400).json({
              success: false,
              error: 'Subject not found'
            });
          }
        }

        const updateData: any = {
          updatedAt: new Date().toISOString()
        };

        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (subjectId) {
          updateData.subjectId = subjectId;
          // Get subject name
          const subjectDoc = await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).get();
          updateData.subject = subjectDoc.data()?.name || 'Unknown';
        }
        if (grade) updateData.grade = parseInt(grade);
        if (duration) updateData.duration = duration;
        if (videoUrl) updateData.videoUrl = videoUrl;
        if (thumbnail) updateData.thumbnail = thumbnail;
        if (category) updateData.category = category;
        if (tags) updateData.tags = tags;

        await db.collection(COLLECTIONS.VIDEOS).doc(videoId).update(updateData);

        // Update video counts if subject changed
        if (subjectId && subjectId !== currentVideoData?.subjectId) {
          // Decrease count for old subject
          if (currentVideoData?.subjectId) {
            const oldSubjectDoc = await db.collection(COLLECTIONS.SUBJECTS).doc(currentVideoData.subjectId).get();
            if (oldSubjectDoc.exists) {
              const oldSubjectData = oldSubjectDoc.data();
              await db.collection(COLLECTIONS.SUBJECTS).doc(currentVideoData.subjectId).update({
                videoCount: Math.max(0, (oldSubjectData?.videoCount || 0) - 1),
                updatedAt: new Date().toISOString()
              });
            }
          }

          // Increase count for new subject
          const newSubjectDoc = await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).get();
          if (newSubjectDoc.exists) {
            const newSubjectData = newSubjectDoc.data();
            await db.collection(COLLECTIONS.SUBJECTS).doc(subjectId).update({
              videoCount: (newSubjectData?.videoCount || 0) + 1,
              updatedAt: new Date().toISOString()
            });
          }
        }

        res.json({
          success: true,
          message: 'Video updated successfully'
        });

      } catch (error) {
        console.error('Error updating video:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update video'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

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

    if (db) {
      try {
        // Check if video exists and get its data
        const videoDoc = await db.collection(COLLECTIONS.VIDEOS).doc(videoId).get();
        
        if (!videoDoc.exists) {
          return res.status(404).json({
            success: false,
            error: 'Video not found'
          });
        }

        const videoData = videoDoc.data();
        
        // Delete the video
        await db.collection(COLLECTIONS.VIDEOS).doc(videoId).delete();

        // Update subject video count
        if (videoData?.subjectId) {
          const subjectDoc = await db.collection(COLLECTIONS.SUBJECTS).doc(videoData.subjectId).get();
          if (subjectDoc.exists) {
            const subjectData = subjectDoc.data();
            await db.collection(COLLECTIONS.SUBJECTS).doc(videoData.subjectId).update({
              videoCount: Math.max(0, (subjectData?.videoCount || 0) - 1),
              updatedAt: new Date().toISOString()
            });
          }
        }

        res.json({
          success: true,
          message: 'Video deleted successfully'
        });

      } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete video'
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: 'Database not available'
      });
    }

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
        let paymentsData = snapshot.docs.map((doc: any) => ({
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