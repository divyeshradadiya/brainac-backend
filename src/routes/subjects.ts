import express, { Response } from 'express';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../types';
import { gradeData } from '../data/sample-data';

const router = express.Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userGrade = user.class || 5;
    const classData = gradeData[userGrade];
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: `No content available for class ${userGrade}`
      });
    }

    const subscriptionStatus = user.subscriptionStatus || 'trial';
    
    return res.json({
      success: true,
      data: {
        class: userGrade,
        subjects: classData.subjects,
        subscriptionStatus,
        trialEndDate: user.trialEndDate
      }
    });

  } catch (error) {
    console.error('Error fetching subjects:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/:subjectId/videos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { subjectId } = req.params;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userGrade = user.class || 5;
    const classData = gradeData[userGrade];
    
    if (!classData) {
      return res.status(404).json({
        success: false,
        error: `No content available for class ${userGrade}`
      });
    }

    const subjectVideos = classData.videos.filter(video => video.subject === subjectId);

    return res.json({
      success: true,
      data: {
        class: userGrade,
        videos: subjectVideos,
        totalVideos: subjectVideos.length
      }
    });

  } catch (error) {
    console.error('Error fetching videos:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
