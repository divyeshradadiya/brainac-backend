// Script to populate Firestore with subject data for classes 6-10
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin:', error);
    console.log('Make sure FIREBASE_SERVICE_ACCOUNT_KEY and FIREBASE_PROJECT_ID are set in your .env file');
    process.exit(1);
  }
}

// Subject configurations for different classes
const subjectsByClass = {
  6: {
    mathematics: {
      name: "Mathematics",
      icon: "📐",
      color: "from-primary to-secondary",
      bgColor: "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
      animatedNumbers: ["2", "0", "8", "6", "4", "9", "∑", "π", "∞"],
      units: [
        { id: 1, name: "Knowing Our Numbers", progress: 0, bgColor: "bg-primary/10", borderColor: "border-primary/20" },
        { id: 2, name: "Whole Numbers", progress: 0, bgColor: "bg-secondary/10", borderColor: "border-secondary/20" },
        { id: 3, name: "Playing with Numbers", progress: 0, bgColor: "bg-tertiary/10", borderColor: "border-tertiary/20" },
        { id: 4, name: "Basic Geometrical Ideas", progress: 0, bgColor: "bg-accent/10", borderColor: "border-accent/20" },
        { id: 5, name: "Understanding Elementary Shapes", progress: 0, bgColor: "bg-warning/10", borderColor: "border-warning/20" },
        { id: 6, name: "Integers", progress: 0, bgColor: "bg-muted/10", borderColor: "border-muted/20" }
      ],
      chapters: [
        { id: "1.1", name: "Knowing Our Numbers", unitId: 1, explainers: ["Number Systems", "Place Value", "Reading Large Numbers"] },
        { id: "1.2", name: "Whole Numbers", unitId: 2, explainers: ["Introduction to Whole Numbers", "Properties of Whole Numbers", "Number Line"] },
        { id: "1.3", name: "Playing with Numbers", unitId: 3, explainers: ["Factors and Multiples", "Prime Numbers", "Divisibility Rules"] },
        { id: "1.4", name: "Basic Geometrical Ideas", unitId: 4, explainers: ["Points and Lines", "Line Segments", "Angles"] },
        { id: "1.5", name: "Understanding Elementary Shapes", unitId: 5, explainers: ["2D Shapes", "3D Shapes", "Symmetry"] },
        { id: "1.6", name: "Integers", unitId: 6, explainers: ["Negative Numbers", "Integer Operations", "Number Line with Integers"] }
      ]
    },
    science: {
      name: "Science",
      icon: "🧪",
      color: "from-secondary to-tertiary",
      bgColor: "bg-gradient-to-br from-secondary/5 via-tertiary/5 to-accent/5",
      animatedNumbers: ["H", "O", "C", "N", "6", "2", "O₂", "CO₂", "H₂O"],
      units: [
        { id: 1, name: "Food: Where Does it Come From?", progress: 0, bgColor: "bg-primary/10", borderColor: "border-primary/20" },
        { id: 2, name: "Components of Food", progress: 0, bgColor: "bg-secondary/10", borderColor: "border-secondary/20" },
        { id: 3, name: "Fibre to Fabric", progress: 0, bgColor: "bg-tertiary/10", borderColor: "border-tertiary/20" },
        { id: 4, name: "Sorting Materials into Groups", progress: 0, bgColor: "bg-accent/10", borderColor: "border-accent/20" },
        { id: 5, name: "Separation of Substances", progress: 0, bgColor: "bg-success/10", borderColor: "border-success/20" }
      ],
      chapters: [
        { id: "2.1", name: "Food: Where Does it Come From?", unitId: 1, explainers: ["Plant and Animal Sources", "Food Chains", "Herbivores and Carnivores"] },
        { id: "2.2", name: "Components of Food", unitId: 2, explainers: ["Nutrients", "Balanced Diet", "Deficiency Diseases"] },
        { id: "2.3", name: "Fibre to Fabric", unitId: 3, explainers: ["Plant Fibres", "Animal Fibres", "Spinning and Weaving"] },
        { id: "2.4", name: "Sorting Materials into Groups", unitId: 4, explainers: ["Properties of Materials", "Hard and Soft Materials", "Transparent and Opaque"] },
        { id: "2.5", name: "Separation of Substances", unitId: 5, explainers: ["Handpicking", "Winnowing", "Sieving"] }
      ]
    },
    english: {
      name: "English Literature",
      icon: "📚",
      color: "from-accent to-warning",
      bgColor: "bg-gradient-to-br from-accent/5 via-warning/5 to-muted/5",
      animatedNumbers: ["A", "B", "C", "&", "?", "!", ".", ",", "'"],
      units: [
        { id: 1, name: "A Tale of Two Birds", progress: 0, bgColor: "bg-primary/10", borderColor: "border-primary/20" },
        { id: 2, name: "The Friendly Mongoose", progress: 0, bgColor: "bg-secondary/10", borderColor: "border-secondary/20" },
        { id: 3, name: "The Shepherd's Treasure", progress: 0, bgColor: "bg-tertiary/10", borderColor: "border-tertiary/20" },
        { id: 4, name: "The Old-Clock Shop", progress: 0, bgColor: "bg-accent/10", borderColor: "border-accent/20" },
        { id: 5, name: "Tansen", progress: 0, bgColor: "bg-warning/10", borderColor: "border-warning/20" }
      ],
      chapters: [
        { id: "3.1", name: "A Tale of Two Birds", unitId: 1, explainers: ["Story Analysis", "Character Study", "Moral Lessons"] },
        { id: "3.2", name: "The Friendly Mongoose", unitId: 2, explainers: ["Plot Development", "Theme Analysis", "Vocabulary Building"] },
        { id: "3.3", name: "The Shepherd's Treasure", unitId: 3, explainers: ["Wisdom Stories", "Cultural Values", "Reading Comprehension"] },
        { id: "3.4", name: "The Old-Clock Shop", unitId: 4, explainers: ["Descriptive Writing", "Setting Analysis", "Literary Devices"] },
        { id: "3.5", name: "Tansen", unitId: 5, explainers: ["Historical Stories", "Music and Culture", "Biography Writing"] }
      ]
    }
  },
  7: {
    mathematics: {
      name: "Mathematics",
      icon: "📐",
      color: "from-primary to-secondary",
      bgColor: "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
      animatedNumbers: ["2", "0", "8", "6", "4", "9", "∑", "π", "∞"],
      units: [
        { id: 1, name: "Integers", progress: 0, bgColor: "bg-primary/10", borderColor: "border-primary/20" },
        { id: 2, name: "Fractions and Decimals", progress: 0, bgColor: "bg-secondary/10", borderColor: "border-secondary/20" },
        { id: 3, name: "Data Handling", progress: 0, bgColor: "bg-tertiary/10", borderColor: "border-tertiary/20" },
        { id: 4, name: "Simple Equations", progress: 0, bgColor: "bg-accent/10", borderColor: "border-accent/20" },
        { id: 5, name: "Lines and Angles", progress: 0, bgColor: "bg-warning/10", borderColor: "border-warning/20" },
        { id: 6, name: "The Triangle and its Properties", progress: 0, bgColor: "bg-muted/10", borderColor: "border-muted/20" }
      ],
      chapters: [
        { id: "1.1", name: "Integers", unitId: 1, explainers: ["Integer Operations", "Properties of Integers", "Applications"] },
        { id: "1.2", name: "Fractions and Decimals", unitId: 2, explainers: ["Fraction Operations", "Decimal Operations", "Converting Forms"] },
        { id: "1.3", name: "Data Handling", unitId: 3, explainers: ["Collecting Data", "Organizing Data", "Bar Graphs"] },
        { id: "1.4", name: "Simple Equations", unitId: 4, explainers: ["Solving Equations", "Word Problems", "Algebraic Expressions"] },
        { id: "1.5", name: "Lines and Angles", unitId: 5, explainers: ["Types of Lines", "Types of Angles", "Angle Relationships"] },
        { id: "1.6", name: "The Triangle and its Properties", unitId: 6, explainers: ["Triangle Types", "Triangle Properties", "Angle Sum Property"] }
      ]
    }
  },
  8: {
    mathematics: {
      name: "Mathematics",
      icon: "📐",
      color: "from-primary to-secondary",
      bgColor: "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
      animatedNumbers: ["2", "0", "8", "6", "4", "9", "∑", "π", "∞"],
      units: [
        { id: 1, name: "Rational Numbers", progress: 0, bgColor: "bg-primary/10", borderColor: "border-primary/20" },
        { id: 2, name: "Linear Equations in One Variable", progress: 0, bgColor: "bg-secondary/10", borderColor: "border-secondary/20" },
        { id: 3, name: "Understanding Quadrilaterals", progress: 0, bgColor: "bg-tertiary/10", borderColor: "border-tertiary/20" },
        { id: 4, name: "Practical Geometry", progress: 0, bgColor: "bg-accent/10", borderColor: "border-accent/20" },
        { id: 5, name: "Data Handling", progress: 0, bgColor: "bg-warning/10", borderColor: "border-warning/20" },
        { id: 6, name: "Squares and Square Roots", progress: 0, bgColor: "bg-muted/10", borderColor: "border-muted/20" }
      ],
      chapters: [
        { id: "1.1", name: "Rational Numbers", unitId: 1, explainers: ["Rational Number Properties", "Operations on Rationals", "Representation"] },
        { id: "1.2", name: "Linear Equations in One Variable", unitId: 2, explainers: ["Solving Linear Equations", "Applications", "Word Problems"] },
        { id: "1.3", name: "Understanding Quadrilaterals", unitId: 3, explainers: ["Types of Quadrilaterals", "Properties", "Angle Sum"] },
        { id: "1.4", name: "Practical Geometry", unitId: 4, explainers: ["Construction Techniques", "Using Instruments", "Geometric Drawings"] },
        { id: "1.5", name: "Data Handling", unitId: 5, explainers: ["Probability Basics", "Data Representation", "Statistics"] },
        { id: "1.6", name: "Squares and Square Roots", unitId: 6, explainers: ["Perfect Squares", "Finding Square Roots", "Applications"] }
      ]
    }
  },
  9: {
    mathematics: {
      name: "Mathematics",
      icon: "📐",
      color: "from-primary to-secondary",
      bgColor: "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
      animatedNumbers: ["2", "0", "8", "6", "4", "9", "∑", "π", "∞"],
      units: [
        { id: 1, name: "Number Systems", progress: 0, bgColor: "bg-primary/10", borderColor: "border-primary/20" },
        { id: 2, name: "Polynomials", progress: 0, bgColor: "bg-secondary/10", borderColor: "border-secondary/20" },
        { id: 3, name: "Coordinate Geometry", progress: 0, bgColor: "bg-tertiary/10", borderColor: "border-tertiary/20" },
        { id: 4, name: "Linear Equations in Two Variables", progress: 0, bgColor: "bg-accent/10", borderColor: "border-accent/20" },
        { id: 5, name: "Introduction to Euclid's Geometry", progress: 0, bgColor: "bg-warning/10", borderColor: "border-warning/20" },
        { id: 6, name: "Lines and Angles", progress: 0, bgColor: "bg-muted/10", borderColor: "border-muted/20" }
      ],
      chapters: [
        { id: "1.1", name: "Number Systems", unitId: 1, explainers: ["Real Numbers", "Irrational Numbers", "Number Line"] },
        { id: "1.2", name: "Polynomials", unitId: 2, explainers: ["Polynomial Basics", "Operations", "Factorization"] },
        { id: "1.3", name: "Coordinate Geometry", unitId: 3, explainers: ["Cartesian Plane", "Plotting Points", "Distance Formula"] },
        { id: "1.4", name: "Linear Equations in Two Variables", unitId: 4, explainers: ["Solving Systems", "Graphical Method", "Applications"] },
        { id: "1.5", name: "Introduction to Euclid's Geometry", unitId: 5, explainers: ["Euclid's Axioms", "Geometric Proofs", "Definitions"] },
        { id: "1.6", name: "Lines and Angles", unitId: 6, explainers: ["Parallel Lines", "Transversals", "Angle Properties"] }
      ]
    }
  },
  10: {
    mathematics: {
      name: "Mathematics",
      icon: "📐",
      color: "from-primary to-secondary",
      bgColor: "bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5",
      animatedNumbers: ["2", "0", "8", "6", "4", "9", "∑", "π", "∞"],
      units: [
        { id: 1, name: "Real Numbers", progress: 0, bgColor: "bg-primary/10", borderColor: "border-primary/20" },
        { id: 2, name: "Polynomials", progress: 0, bgColor: "bg-secondary/10", borderColor: "border-secondary/20" },
        { id: 3, name: "Pair of Linear Equations in Two Variables", progress: 0, bgColor: "bg-tertiary/10", borderColor: "border-tertiary/20" },
        { id: 4, name: "Quadratic Equations", progress: 0, bgColor: "bg-accent/10", borderColor: "border-accent/20" },
        { id: 5, name: "Arithmetic Progressions", progress: 0, bgColor: "bg-warning/10", borderColor: "border-warning/20" },
        { id: 6, name: "Triangles", progress: 0, bgColor: "bg-muted/10", borderColor: "border-muted/20" }
      ],
      chapters: [
        { id: "1.1", name: "Real Numbers", unitId: 1, explainers: ["Euclid's Division Lemma", "Fundamental Theorem", "Decimal Expansions"] },
        { id: "1.2", name: "Polynomials", unitId: 2, explainers: ["Polynomial Degrees", "Zeros of Polynomials", "Relationship between Zeros"] },
        { id: "1.3", name: "Pair of Linear Equations", unitId: 3, explainers: ["Graphical Method", "Algebraic Methods", "Word Problems"] },
        { id: "1.4", name: "Quadratic Equations", unitId: 4, explainers: ["Solving Methods", "Nature of Roots", "Applications"] },
        { id: "1.5", name: "Arithmetic Progressions", unitId: 5, explainers: ["AP Basics", "nth Term", "Sum of n Terms"] },
        { id: "1.6", name: "Triangles", unitId: 6, explainers: ["Similarity", "Congruence", "Pythagoras Theorem"] }
      ]
    }
  }
};

// Create explainers data for each subject
const createExplainerVideos = (chapters: any[]) => {
  return chapters.flatMap((chapter, chapterIndex) => 
    chapter.explainers.map((explainer: string, explainerIndex: number) => ({
      id: `${chapter.id}-${explainerIndex + 1}`,
      chapterId: chapter.id,
      title: explainer,
      duration: `${Math.floor(Math.random() * 5) + 3} min ${Math.floor(Math.random() * 60)} secs`,
      thumbnail: `https://picsum.photos/300/200?random=${chapterIndex * 10 + explainerIndex}`,
      description: `Comprehensive explanation of ${explainer} from ${chapter.name}`,
      tags: [chapter.name.toLowerCase().replace(/\s+/g, '-'), explainer.toLowerCase().replace(/\s+/g, '-')],
      difficulty: Math.random() > 0.5 ? 'beginner' : 'intermediate',
      views: Math.floor(Math.random() * 1000) + 100
    }))
  );
};

async function populateSubjectData() {
  console.log('🚀 Starting to populate Firestore with subject data for classes 6-10...');

  try {
    const db = getFirestore();
    const batchSize = 450; // Stay under Firestore's 500 limit
    let currentBatch = db.batch();
    let operationCount = 0;

    // Populate data for each class
    for (const [classNum, subjects] of Object.entries(subjectsByClass)) {
      console.log(`📚 Processing Class ${classNum}...`);

      for (const [subjectKey, subjectData] of Object.entries(subjects)) {
        console.log(`  📖 Adding ${subjectData.name} for Class ${classNum}...`);

        // Create subject document
        const subjectDocRef = db.collection('subjects').doc(`class-${classNum}-${subjectKey}`);
        currentBatch.set(subjectDocRef, {
          classLevel: parseInt(classNum),
          subjectKey,
          name: subjectData.name,
          icon: subjectData.icon,
          color: subjectData.color,
          bgColor: subjectData.bgColor,
          animatedNumbers: subjectData.animatedNumbers,
          totalUnits: subjectData.units.length,
          totalChapters: subjectData.chapters.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        operationCount++;

        // Create units
        subjectData.units.forEach((unit: any) => {
          const unitDocRef = db.collection('subjects').doc(`class-${classNum}-${subjectKey}`).collection('units').doc(unit.id.toString());
          currentBatch.set(unitDocRef, {
            ...unit,
            classLevel: parseInt(classNum),
            subjectKey,
            createdAt: new Date().toISOString()
          });
          operationCount++;
        });

        // Create chapters
        subjectData.chapters.forEach((chapter: any) => {
          const chapterDocRef = db.collection('subjects').doc(`class-${classNum}-${subjectKey}`).collection('chapters').doc(chapter.id);
          currentBatch.set(chapterDocRef, {
            id: chapter.id,
            name: chapter.name,
            unitId: chapter.unitId,
            classLevel: parseInt(classNum),
            subjectKey,
            totalExplainers: chapter.explainers.length,
            createdAt: new Date().toISOString()
          });
          operationCount++;
        });

        // Create explainer videos
        const explainers = createExplainerVideos(subjectData.chapters);
        for (const explainer of explainers) {
          const explainerDocRef = db.collection('subjects').doc(`class-${classNum}-${subjectKey}`).collection('explainers').doc(explainer.id);
          currentBatch.set(explainerDocRef, {
            ...explainer,
            classLevel: parseInt(classNum),
            subjectKey,
            createdAt: new Date().toISOString()
          });
          operationCount++;

          // Commit batch if we're near the limit
          if (operationCount >= batchSize) {
            console.log(`📦 Committing batch with ${operationCount} operations...`);
            await currentBatch.commit();
            currentBatch = db.batch();
            operationCount = 0;
          }
        }

        console.log(`    ✅ Added ${subjectData.units.length} units, ${subjectData.chapters.length} chapters, and ${explainers.length} explainers`);
      }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      console.log(`📦 Committing final batch with ${operationCount} operations...`);
      await currentBatch.commit();
    }

    console.log(`\n🎉 Subject data population completed!`);
    console.log(`📊 Summary:`);
    console.log(`   • Classes: 6-10 (5 classes)`);
    console.log(`   • Subjects per class: 1-3 subjects`);
    console.log(`   • Data structure: subjects/{classLevel-subjectKey}/{units|chapters|explainers}`);

  } catch (error) {
    console.error('❌ Failed to populate subject data:', error);
  }
}

// Export for use in scripts
export { populateSubjectData };

// Run population if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  populateSubjectData()
    .then(() => {
      console.log('🏁 Subject data population script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Subject data population script failed:', error);
      process.exit(1);
    });
}