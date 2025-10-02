import express, { Response } from 'express';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../types';
import { getFirestore } from 'firebase-admin/firestore';

const router = express.Router();

// Temporary test route with sample data (no authentication) - for development only
router.get('/sample', (req, res) => {
  const sampleSubjects = [
    {
      id: `class-7-mathematics`,
      name: "Mathematics",
      icon: "📐",
      color: "from-primary to-secondary",
      bgColor: "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
      animatedNumbers: ["2", "0", "8", "6", "4", "9", "∑", "π", "∞"],
      totalUnits: 6,
      totalChapters: 18,
      totalExplainers: 54
    },
    {
      id: `class-7-science`,
      name: "Science",
      icon: "🧪",
      color: "from-secondary to-tertiary",
      bgColor: "bg-gradient-to-br from-secondary/5 via-tertiary/5 to-accent/5",
      animatedNumbers: ["H", "O", "C", "N", "6", "2", "O₂", "CO₂", "H₂O"],
      totalUnits: 5,
      totalChapters: 15,
      totalExplainers: 45
    },
    {
      id: `class-7-english`,
      name: "English Literature",
      icon: "📚",
      color: "from-accent to-warning",
      bgColor: "bg-gradient-to-br from-accent/5 via-warning/5 to-muted/5",
      animatedNumbers: ["A", "B", "C", "&", "?", "!", ".", ",", "'"],
      totalUnits: 5,
      totalChapters: 15,
      totalExplainers: 45
    }
  ];

  res.json({
    success: true,
    data: {
      class: 7,
      subjects: sampleSubjects,
      subscriptionStatus: 'trial',
      trialEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    message: 'Sample data for development (no authentication required)'
  });
});

// Get all subjects for user's class from Firestore
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userClass = user.class || 6;
    
    try {
      const db = getFirestore();
      
      // Get subjects for user's class from Firestore
      const subjectsSnapshot = await db.collection('subjects')
        .where('grade', '==', userClass)
        .get();

      if (subjectsSnapshot.empty) {
        // Return empty subjects if none found for this grade
        return res.json({
          success: true,
          data: {
            class: userClass,
            subjects: [],
            subscriptionStatus: user.subscriptionStatus || 'trial',
            trialEndDate: user.trialEndDate
          },
          message: 'No subjects found for this grade'
        });
      }

      // Transform Firestore subjects to match frontend format
      const subjects = await Promise.all(
        subjectsSnapshot.docs.map(async (doc) => {
          const subjectData = doc.data();
          
          // Get units for this subject
          const unitsSnapshot = await db.collection('units')
            .where('subjectId', '==', doc.id)
            .get();

          // Sort units by order
          const sortedUnits = unitsSnapshot.docs.sort((a, b) => {
            const aOrder = a.data().order || 0;
            const bOrder = b.data().order || 0;
            return aOrder - bOrder;
          });

          let totalChapters = 0;
          let totalVideos = 0;

          // Get chapters and videos count
          for (const unitDoc of sortedUnits) {
            const chaptersSnapshot = await db.collection('chapters')
              .where('unitId', '==', unitDoc.id)
              .get();
            
            totalChapters += chaptersSnapshot.size;

            for (const chapterDoc of chaptersSnapshot.docs) {
              const videosSnapshot = await db.collection('videos')
                .where('chapterId', '==', chapterDoc.id)
                .get();
              
              totalVideos += videosSnapshot.size;
            }
          }
          
          return {
            id: doc.id,
            name: subjectData.name,
            description: subjectData.description,
            icon: subjectData.icon || "📚",
            color: subjectData.color || "from-primary to-secondary",
            bgColor: "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
            animatedNumbers: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
            totalUnits: unitsSnapshot.size,
            totalChapters: totalChapters,
            totalExplainers: totalVideos,
            videoCount: totalVideos
          };
        })
      );

      res.json({
        success: true,
        data: {
          class: userClass,
          subjects: subjects,
          subscriptionStatus: user.subscriptionStatus || 'trial',
          trialEndDate: user.trialEndDate
        },
        message: 'Subjects fetched successfully'
      });

    } catch (firestoreError) {
      console.error('Firestore error, falling back to sample data:', firestoreError);
      
      // Fallback to sample data if Firestore fails
      const sampleSubjects = [
        {
          id: `class-${userClass}-mathematics`,
          name: "Mathematics",
          description: "Learn fundamental math concepts",
          icon: "📐",
          color: "from-primary to-secondary",
          bgColor: "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
          animatedNumbers: ["2", "0", "8", "6", "4", "9", "∑", "π", "∞"],
          totalUnits: 6,
          totalChapters: 18,
          totalExplainers: 54,
          videoCount: 54
        },
        {
          id: `class-${userClass}-science`,
          name: "Science",
          description: "Explore the world of science",
          icon: "🧪",
          color: "from-secondary to-tertiary",
          bgColor: "bg-gradient-to-br from-secondary/5 via-tertiary/5 to-accent/5",
          animatedNumbers: ["H", "O", "C", "N", "6", "2", "O₂", "CO₂", "H₂O"],
          totalUnits: 5,
          totalChapters: 15,
          totalExplainers: 45,
          videoCount: 45
        },
        {
          id: `class-${userClass}-english`,
          name: "English Literature",
          description: "Master language and literature",
          icon: "📚",
          color: "from-accent to-warning",
          bgColor: "bg-gradient-to-br from-accent/5 via-warning/5 to-muted/5",
          animatedNumbers: ["A", "B", "C", "&", "?", "!", ".", ",", "'"],
          totalUnits: 5,
          totalChapters: 15,
          totalExplainers: 45,
          videoCount: 45
        }
      ];

      res.json({
        success: true,
        data: {
          class: userClass,
          subjects: sampleSubjects,
          subscriptionStatus: user.subscriptionStatus || 'trial',
          trialEndDate: user.trialEndDate
        },
        message: 'Fallback subjects data'
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

// Get specific subject with units and chapters
router.get('/:subjectId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const { subjectId } = req.params;
    const userClass = user.class || 6;
    
    // Sample data for subject details
    const sampleData = {
      mathematics: {
        subject: {
          id: subjectId,
          name: "Mathematics",
          icon: "📐",
          color: "from-primary to-secondary",
          bgColor: "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
          animatedNumbers: ["2", "0", "8", "6", "4", "9", "∑", "π", "∞"],
          classLevel: userClass
        },
        units: [
          { id: "1", name: "Arithmetic", progress: 0, bgColor: "bg-primary/10", borderColor: "border-primary/20" },
          { id: "2", name: "Geometry", progress: 0, bgColor: "bg-secondary/10", borderColor: "border-secondary/20" },
          { id: "3", name: "Statistics", progress: 0, bgColor: "bg-tertiary/10", borderColor: "border-tertiary/20" },
          { id: "4", name: "Algebra", progress: 0, bgColor: "bg-accent/10", borderColor: "border-accent/20" },
          { id: "5", name: "Trigonometry", progress: 0, bgColor: "bg-warning/10", borderColor: "border-warning/20" },
          { id: "6", name: "Calculus", progress: 0, bgColor: "bg-muted/10", borderColor: "border-muted/20" }
        ],
        chapters: [
          { id: "1.1", name: "Number Systems", unitId: 1, totalExplainers: 3 },
          { id: "1.2", name: "Basic Operations", unitId: 1, totalExplainers: 4 },
          { id: "1.3", name: "Fractions", unitId: 1, totalExplainers: 3 },
          { id: "2.1", name: "Basic Shapes", unitId: 2, totalExplainers: 3 },
          { id: "2.2", name: "Area and Perimeter", unitId: 2, totalExplainers: 4 },
          { id: "2.3", name: "Volume", unitId: 2, totalExplainers: 3 }
        ],
        explainers: [
          { id: "1.1-1", chapterId: "1.1", title: "Introduction to Numbers", duration: "8 min 30 secs", thumbnail: "https://picsum.photos/300/200?random=1", description: "Basic number concepts", tags: ["numbers", "basics"], difficulty: "beginner", views: 150 },
          { id: "1.1-2", chapterId: "1.1", title: "Number Line", duration: "6 min 45 secs", thumbnail: "https://picsum.photos/300/200?random=2", description: "Understanding number line", tags: ["numbers", "line"], difficulty: "beginner", views: 120 },
          { id: "1.1-3", chapterId: "1.1", title: "Comparing Numbers", duration: "7 min 15 secs", thumbnail: "https://picsum.photos/300/200?random=3", description: "How to compare numbers", tags: ["numbers", "comparison"], difficulty: "beginner", views: 100 }
        ]
      },
      science: {
        subject: {
          id: subjectId,
          name: "Science",
          icon: "🧪",
          color: "from-secondary to-tertiary",
          bgColor: "bg-gradient-to-br from-secondary/5 via-tertiary/5 to-accent/5",
          animatedNumbers: ["H", "O", "C", "N", "6", "2", "O₂", "CO₂", "H₂O"],
          classLevel: userClass
        },
        units: [
          { id: "1", name: "Physics", progress: 0, bgColor: "bg-primary/10", borderColor: "border-primary/20" },
          { id: "2", name: "Chemistry", progress: 0, bgColor: "bg-secondary/10", borderColor: "border-secondary/20" },
          { id: "3", name: "Biology", progress: 0, bgColor: "bg-tertiary/10", borderColor: "border-tertiary/20" }
        ],
        chapters: [
          { id: "1.1", name: "Light and Sound", unitId: 1, totalExplainers: 3 },
          { id: "1.2", name: "Motion and Force", unitId: 1, totalExplainers: 4 },
          { id: "2.1", name: "Elements and Compounds", unitId: 2, totalExplainers: 3 },
          { id: "3.1", name: "Plant Life", unitId: 3, totalExplainers: 3 }
        ],
        explainers: [
          { id: "1.1-1", chapterId: "1.1", title: "Properties of Light", duration: "10 min 30 secs", thumbnail: "https://picsum.photos/300/200?random=10", description: "Understanding light properties", tags: ["light", "physics"], difficulty: "beginner", views: 200 }
        ]
      },
      english: {
        subject: {
          id: subjectId,
          name: "English Literature",
          icon: "📚",
          color: "from-accent to-warning",
          bgColor: "bg-gradient-to-br from-accent/5 via-warning/5 to-muted/5",
          animatedNumbers: ["A", "B", "C", "&", "?", "!", ".", ",", "'"],
          classLevel: userClass
        },
        units: [
          { id: "1", name: "Poetry", progress: 0, bgColor: "bg-primary/10", borderColor: "border-primary/20" },
          { id: "2", name: "Prose", progress: 0, bgColor: "bg-secondary/10", borderColor: "border-secondary/20" },
          { id: "3", name: "Grammar", progress: 0, bgColor: "bg-tertiary/10", borderColor: "border-tertiary/20" }
        ],
        chapters: [
          { id: "1.1", name: "Nature Poems", unitId: 1, totalExplainers: 3 },
          { id: "2.1", name: "Short Stories", unitId: 2, totalExplainers: 4 },
          { id: "3.1", name: "Parts of Speech", unitId: 3, totalExplainers: 3 }
        ],
        explainers: [
          { id: "1.1-1", chapterId: "1.1", title: "Reading Poetry", duration: "12 min 15 secs", thumbnail: "https://picsum.photos/300/200?random=20", description: "How to read and understand poetry", tags: ["poetry", "reading"], difficulty: "beginner", views: 180 }
        ]
      }
    };

    // Extract subject type from subjectId (e.g., "class-7-mathematics" -> "mathematics")
    const subjectType = subjectId.split('-').pop() || 'mathematics';
    const subjectKey = subjectType as keyof typeof sampleData;
    
    try {
      const db = getFirestore();
      
      // Try to get subject document from Firestore first
      const subjectDoc = await db.collection('subjects').doc(subjectId).get();
      
      if (subjectDoc.exists) {
        const subjectData = subjectDoc.data();
        
        // Verify user has access to this class
        if (subjectData?.grade !== user.class) {
          return res.status(403).json({
            success: false,
            error: 'Access denied for this class'
          });
        }

        // Get units for this subject
        const unitsSnapshot = await db.collection('units')
          .where('subjectId', '==', subjectId)
          .get();

        const units = await Promise.all(
          unitsSnapshot.docs
            .sort((a, b) => {
              const aOrder = a.data().order || 0;
              const bOrder = b.data().order || 0;
              return aOrder - bOrder;
            })
            .map(async (unitDoc) => {
            const unitData = unitDoc.data();
            
            // Get chapters for this unit
            const chaptersSnapshot = await db.collection('chapters')
              .where('unitId', '==', unitDoc.id)
              .get();

            const chapters = await Promise.all(
              chaptersSnapshot.docs
                .sort((a, b) => {
                  const aOrder = a.data().order || 0;
                  const bOrder = b.data().order || 0;
                  return aOrder - bOrder;
                })
                .map(async (chapterDoc) => {
                const chapterData = chapterDoc.data();
                
                // Get explainers (videos) for this chapter
                const explainersSnapshot = await db.collection('videos')
                  .where('chapterId', '==', chapterDoc.id)
                  .get();

                const explainers = explainersSnapshot.docs
                  .sort((a, b) => {
                    const aOrder = a.data().order || 0;
                    const bOrder = b.data().order || 0;
                    return aOrder - bOrder;
                  })
                  .map(explainerDoc => ({
                    id: explainerDoc.id,
                    ...explainerDoc.data()
                  }));

                return {
                  id: chapterDoc.id,
                  name: chapterData.name,
                  description: chapterData.description,
                  unitId: chapterData.unitId,
                  order: chapterData.order,
                  totalExplainers: explainers.length,
                  explainers
                };
              })
            );

            return {
              id: unitDoc.id,
              name: unitData.name,
              description: unitData.description,
              order: unitData.order,
              progress: 0, // Calculate based on user progress
              bgColor: "bg-primary/10",
              borderColor: "border-primary/20",
              chapters
            };
          })
        );

        return res.json({
          success: true,
          data: {
            subject: {
              id: subjectDoc.id,
              name: subjectData.name,
              description: subjectData.description,
              icon: subjectData.icon || "📚",
              color: subjectData.color || "from-primary to-secondary",
              bgColor: "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
              animatedNumbers: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
              grade: subjectData.grade
            },
            units,
            // Legacy fields for backward compatibility
            chapters: units.flatMap(unit => unit.chapters),
            explainers: units.flatMap(unit => 
              unit.chapters.flatMap(chapter => chapter.explainers)
            )
          }
        });
      }
    } catch (firestoreError) {
      console.log('Firestore not available, using sample data:', firestoreError instanceof Error ? firestoreError.message : 'Unknown error');
    }

    // Fallback to sample data
    const data = sampleData[subjectKey] || sampleData.mathematics;
    
    return res.json({
      success: true,
      data,
      message: 'Using sample data (Firestore not configured)'
    });

  } catch (error) {
    console.error('Error fetching subject details:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get all videos for user's class
router.get('/all/videos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userClass = user.class || 6;
    const db = getFirestore();
    
    // Fetch all subjects for the user's class
    const subjectsSnapshot = await db.collection('subjects')
      .where('grade', '==', userClass)
      .get();

    if (subjectsSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: `No content available for class ${userClass}`
      });
    }

    const allVideos: any[] = [];
    
    // Get explainers from all subjects through units and chapters
    for (const subjectDoc of subjectsSnapshot.docs) {
      // Get all videos for this subject (regardless of hierarchy)
      const videosSnapshot = await db.collection('videos')
        .where('subjectId', '==', subjectDoc.id)
        .get();
      
      videosSnapshot.docs.forEach(videoDoc => {
        const videoData = videoDoc.data();
        allVideos.push({
          id: videoDoc.id,
          ...videoData,
          subjectId: subjectDoc.id,
          subjectName: subjectDoc.data().name
        });
      });
    }

    return res.json({
      success: true,
      data: {
        class: userClass,
        videos: allVideos,
        totalVideos: allVideos.length
      }
    });

  } catch (error) {
    console.error('Error fetching all videos:', error);
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

    const db = getFirestore();
    
    // Get subject document to verify access
    const subjectDoc = await db.collection('subjects').doc(subjectId).get();
    
    if (!subjectDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found'
      });
    }

    const subjectData = subjectDoc.data();
    
    // Verify user has access to this class
    if (subjectData?.grade !== user.class) {
      return res.status(403).json({
        success: false,
        error: 'Access denied for this class'
      });
    }

    // Get all videos for this subject
    const videosSnapshot = await db.collection('videos')
      .where('subjectId', '==', subjectId)
      .get();

    const videos = videosSnapshot.docs
      .sort((a, b) => {
        const aOrder = a.data().order || 0;
        const bOrder = b.data().order || 0;
        return aOrder - bOrder;
      })
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

    return res.json({
      success: true,
      data: {
        class: user.class,
        videos,
        totalVideos: videos.length
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

// Get individual video by ID
router.get('/videos/:videoId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { videoId } = req.params;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const userClass = user.class || 6;
    const db = getFirestore();
    
    // Search for the video across all subjects in the user's class
    const subjectsSnapshot = await db.collection('subjects')
      .where('grade', '==', userClass)
      .get();

    if (subjectsSnapshot.empty) {
      return res.status(404).json({
        success: false,
        error: `No content available for class ${userClass}`
      });
    }

    let videoData = null;
    let subjectInfo = null;

    // Search for the video in all subjects
    const videoDoc = await db.collection('videos').doc(videoId).get();
    
    if (videoDoc.exists) {
      const video = videoDoc.data();
      
      // Verify this video belongs to a subject in user's class
      const subjectDoc = await db.collection('subjects').doc(video?.subjectId).get();
      
      if (subjectDoc.exists && subjectDoc.data()?.grade === userClass) {
        videoData = video;
        subjectInfo = {
          id: subjectDoc.id,
          name: subjectDoc.data()?.name
        };
      }
    }

    if (!videoData) {
      return res.status(404).json({
        success: false,
        error: 'Video not found'
      });
    }

    return res.json({
      success: true,
      data: {
        video: {
          id: videoId,
          ...videoData
        },
        class: userClass
      }
    });

  } catch (error) {
    console.error('Error fetching video:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;
