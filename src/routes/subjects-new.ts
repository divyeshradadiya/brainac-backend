import { Router } from 'express';
import { Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { db } from '../index';
import { COLLECTIONS } from '../types/firestore';
import type { AuthRequest } from '../types';

const router = Router();

// Get subjects for user's class
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized',
      });
    }

    // Get subjects for user's class
    const subjectsSnapshot = await db.collection('subjects')
      .where('classLevel', '==', user.class)
      .get();

    const subjects = subjectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: {
        subjects,
        classLevel: user.class,
        totalSubjects: subjects.length,
        subscriptionStatus: user.subscriptionStatus,
        trialEndDate: user.trialEndDate
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

// Get specific subject details with units, chapters, and explainers
router.get('/:subjectId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { subjectId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized',
      });
    }

    // Get subject document
    const subjectDoc = await db.collection('subjects').doc(subjectId).get();
    
    if (!subjectDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    const subjectData = subjectDoc.data();

    // Verify user has access to this subject (same class level)
    if (subjectData?.classLevel !== user.class) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this subject'
      });
    }

    // Get units
    const unitsSnapshot = await db.collection('subjects').doc(subjectId).collection('units').get();
    const units = unitsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a: any, b: any) => parseInt(a.id) - parseInt(b.id));

    // Get chapters
    const chaptersSnapshot = await db.collection('subjects').doc(subjectId).collection('chapters').get();
    const chapters = chaptersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => parseFloat(a.id) - parseFloat(b.id));

    // Get explainers
    const explainersSnapshot = await db.collection('subjects').doc(subjectId).collection('explainers').get();
    const explainers = explainersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: {
        subject: { id: subjectId, ...subjectData },
        units,
        chapters,
        explainers,
        classLevel: user.class
      }
    });
  } catch (error: any) {
    console.error('Error fetching subject details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subject details'
    });
  }
});

// Get explainers for a specific chapter
router.get('/:subjectId/chapters/:chapterId/explainers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { subjectId, chapterId } = req.params;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized',
      });
    }

    // Get explainers for specific chapter
    const explainersSnapshot = await db.collection('subjects')
      .doc(subjectId)
      .collection('explainers')
      .where('chapterId', '==', chapterId)
      .get();

    const explainers = explainersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({
      success: true,
      data: {
        explainers,
        chapterId,
        subjectId,
        totalExplainers: explainers.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching chapter explainers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chapter explainers'
    });
  }
});

// Get all videos for user's class (backward compatibility)
router.get('/all/videos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!db) {
      return res.status(500).json({
        success: false,
        error: 'Database not initialized',
      });
    }

    // Get all explainers for user's class across all subjects
    const subjectsSnapshot = await db.collection('subjects')
      .where('classLevel', '==', user.class)
      .get();

    const allVideos: any[] = [];

    for (const subjectDoc of subjectsSnapshot.docs) {
      const explainersSnapshot = await db.collection('subjects')
        .doc(subjectDoc.id)
        .collection('explainers')
        .get();

      const subjectVideos = explainersSnapshot.docs.map(doc => ({
        id: doc.id,
        subjectId: subjectDoc.id,
        subjectName: subjectDoc.data().name,
        ...doc.data()
      }));

      allVideos.push(...subjectVideos);
    }

    res.json({
      success: true,
      data: {
        videos: allVideos,
        classLevel: user.class,
        totalVideos: allVideos.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching all videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch videos'
    });
  }
});

export default router;