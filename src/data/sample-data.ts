// Sample data for different classes (5-10)
export interface GradeData {
  grade: number;
  subjects: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
  }>;
  videos: Array<{
    id: string;
    title: string;
    subject: string;
    grade: number;
    thumbnail: string;
    duration: string;
    views: string;
    likes: string;
    description: string;
    videoUrl: string;
    category?: string;
  }>;
}

export const gradeData: Record<number, GradeData> = {
  5: {
    grade: 5,
    subjects: [
      {
        id: "math-5",
        name: "Mathematics",
        icon: "🧮",
        color: "from-blue-500 to-cyan-500",
        description: "Numbers, fractions, basic geometry"
      },
      {
        id: "science-5",
        name: "Science",
        icon: "🔬",
        color: "from-green-500 to-emerald-500",
        description: "Plants, animals, simple experiments"
      },
      {
        id: "english-5",
        name: "English",
        icon: "📚",
        color: "from-purple-500 to-pink-500",
        description: "Reading, writing, grammar basics"
      },
      {
        id: "social-5",
        name: "Social Studies",
        icon: "🌍",
        color: "from-orange-500 to-red-500",
        description: "Geography, history, civics"
      }
    ],
    videos: [
      {
        id: "math-5-1",
        title: "Introduction to Fractions",
        subject: "math-5",
        grade: 5,
        thumbnail: "/thumbnails/math-5-1.jpg",
        duration: "15:30",
        views: "1.2K",
        likes: "98",
        description: "Learn about fractions with fun examples and activities",
        videoUrl: "/videos/math-5-fractions.mp4",
        category: "Basic Math"
      },
      {
        id: "science-5-1",
        title: "Parts of a Plant",
        subject: "science-5",
        grade: 5,
        thumbnail: "/thumbnails/science-5-1.jpg",
        duration: "12:45",
        views: "856",
        likes: "76",
        description: "Explore the different parts of plants and their functions",
        videoUrl: "/videos/science-5-plants.mp4",
        category: "Biology"
      }
    ]
  },
  6: {
    grade: 6,
    subjects: [
      {
        id: "math-6",
        name: "Mathematics",
        icon: "🧮",
        color: "from-blue-500 to-cyan-500",
        description: "Decimals, ratios, integers"
      },
      {
        id: "science-6",
        name: "Science",
        icon: "🔬",
        color: "from-green-500 to-emerald-500",
        description: "Light, motion, food and health"
      },
      {
        id: "english-6",
        name: "English",
        icon: "📚",
        color: "from-purple-500 to-pink-500",
        description: "Stories, poems, comprehension"
      },
      {
        id: "social-6",
        name: "Social Studies",
        icon: "🌍",
        color: "from-orange-500 to-red-500",
        description: "Ancient civilizations, maps"
      }
    ],
    videos: [
      {
        id: "math-6-1",
        title: "Understanding Decimals",
        subject: "math-6",
        grade: 6,
        thumbnail: "/thumbnails/math-6-1.jpg",
        duration: "18:20",
        views: "2.1K",
        likes: "142",
        description: "Master decimal operations with step-by-step explanations",
        videoUrl: "/videos/math-6-decimals.mp4",
        category: "Number Systems"
      },
      {
        id: "science-6-1",
        title: "Light and Shadows",
        subject: "science-6",
        grade: 6,
        thumbnail: "/thumbnails/science-6-1.jpg",
        duration: "14:55",
        views: "1.5K",
        likes: "118",
        description: "Discover how light travels and creates shadows",
        videoUrl: "/videos/science-6-light.mp4",
        category: "Physics"
      }
    ]
  },
  7: {
    grade: 7,
    subjects: [
      {
        id: "math-7",
        name: "Mathematics",
        icon: "🧮",
        color: "from-blue-500 to-cyan-500",
        description: "Algebra basics, geometry"
      },
      {
        id: "science-7",
        name: "Science",
        icon: "🔬",
        color: "from-green-500 to-emerald-500",
        description: "Heat, acids and bases, weather"
      },
      {
        id: "english-7",
        name: "English",
        icon: "📚",
        color: "from-purple-500 to-pink-500",
        description: "Literature, creative writing"
      },
      {
        id: "social-7",
        name: "Social Studies",
        icon: "🌍",
        color: "from-orange-500 to-red-500",
        description: "Medieval history, democracy"
      }
    ],
    videos: [
      {
        id: "math-7-1",
        title: "Introduction to Algebra",
        subject: "math-7",
        grade: 7,
        thumbnail: "/thumbnails/math-7-1.jpg",
        duration: "22:10",
        views: "3.2K",
        likes: "201",
        description: "Begin your algebra journey with variables and expressions",
        videoUrl: "/videos/math-7-algebra.mp4",
        category: "Algebra"
      },
      {
        id: "science-7-1",
        title: "Heat and Temperature",
        subject: "science-7",
        grade: 7,
        thumbnail: "/thumbnails/science-7-1.jpg",
        duration: "16:30",
        views: "2.4K",
        likes: "156",
        description: "Learn about heat transfer and temperature measurement",
        videoUrl: "/videos/science-7-heat.mp4",
        category: "Physics"
      }
    ]
  },
  8: {
    grade: 8,
    subjects: [
      {
        id: "math-8",
        name: "Mathematics",
        icon: "🧮",
        color: "from-blue-500 to-cyan-500",
        description: "Linear equations, mensuration"
      },
      {
        id: "science-8",
        name: "Science",
        icon: "🔬",
        color: "from-green-500 to-emerald-500",
        description: "Force, sound, pollution"
      },
      {
        id: "english-8",
        name: "English",
        icon: "📚",
        color: "from-purple-500 to-pink-500",
        description: "Drama, essays, language skills"
      },
      {
        id: "social-8",
        name: "Social Studies",
        icon: "🌍",
        color: "from-orange-500 to-red-500",
        description: "Modern India, constitution"
      }
    ],
    videos: [
      {
        id: "math-8-1",
        title: "Linear Equations in One Variable",
        subject: "math-8",
        grade: 8,
        thumbnail: "/thumbnails/math-8-1.jpg",
        duration: "25:45",
        views: "4.1K",
        likes: "287",
        description: "Solve linear equations step by step with real-world examples",
        videoUrl: "/videos/math-8-linear.mp4",
        category: "Algebra"
      },
      {
        id: "science-8-1",
        title: "Force and Pressure",
        subject: "science-8",
        grade: 8,
        thumbnail: "/thumbnails/science-8-1.jpg",
        duration: "19:20",
        views: "3.6K",
        likes: "234",
        description: "Understand forces in action and pressure in fluids",
        videoUrl: "/videos/science-8-force.mp4",
        category: "Physics"
      }
    ]
  },
  9: {
    grade: 9,
    subjects: [
      {
        id: "math-9",
        name: "Mathematics",
        icon: "🧮",
        color: "from-blue-500 to-cyan-500",
        description: "Coordinate geometry, statistics"
      },
      {
        id: "science-9",
        name: "Science",
        icon: "🔬",
        color: "from-green-500 to-emerald-500",
        description: "Matter, living world, motion"
      },
      {
        id: "english-9",
        name: "English",
        icon: "📚",
        color: "from-purple-500 to-pink-500",
        description: "Literature analysis, writing skills"
      },
      {
        id: "social-9",
        name: "Social Studies",
        icon: "🌍",
        color: "from-orange-500 to-red-500",
        description: "French Revolution, democracy"
      }
    ],
    videos: [
      {
        id: "math-9-1",
        title: "Coordinate Geometry Basics",
        subject: "math-9",
        grade: 9,
        thumbnail: "/thumbnails/math-9-1.jpg",
        duration: "28:15",
        views: "5.3K",
        likes: "389",
        description: "Plot points and understand the coordinate plane",
        videoUrl: "/videos/math-9-coordinate.mp4",
        category: "Geometry"
      },
      {
        id: "science-9-1",
        title: "Structure of the Atom",
        subject: "science-9",
        grade: 9,
        thumbnail: "/thumbnails/science-9-1.jpg",
        duration: "21:40",
        views: "4.8K",
        likes: "312",
        description: "Explore atomic structure and subatomic particles",
        videoUrl: "/videos/science-9-atom.mp4",
        category: "Chemistry"
      }
    ]
  },
  10: {
    grade: 10,
    subjects: [
      {
        id: "math-10",
        name: "Mathematics",
        icon: "🧮",
        color: "from-blue-500 to-cyan-500",
        description: "Quadratic equations, trigonometry"
      },
      {
        id: "science-10",
        name: "Science",
        icon: "🔬",
        color: "from-green-500 to-emerald-500",
        description: "Light, heredity, natural resources"
      },
      {
        id: "english-10",
        name: "English",
        icon: "📚",
        color: "from-purple-500 to-pink-500",
        description: "Literature, letter writing"
      },
      {
        id: "social-10",
        name: "Social Studies",
        icon: "🌍",
        color: "from-orange-500 to-red-500",
        description: "Nationalism, economy, democracy"
      }
    ],
    videos: [
      {
        id: "math-10-1",
        title: "Quadratic Equations",
        subject: "math-10",
        grade: 10,
        thumbnail: "/thumbnails/math-10-1.jpg",
        duration: "32:25",
        views: "6.7K",
        likes: "456",
        description: "Master quadratic equations using different methods",
        videoUrl: "/videos/math-10-quadratic.mp4",
        category: "Algebra"
      },
      {
        id: "science-10-1",
        title: "Light - Reflection and Refraction",
        subject: "science-10",
        grade: 10,
        thumbnail: "/thumbnails/science-10-1.jpg",
        duration: "24:50",
        views: "5.9K",
        likes: "398",
        description: "Understand how light behaves with mirrors and lenses",
        videoUrl: "/videos/science-10-light.mp4",
        category: "Physics"
      }
    ]
  }
};

export const subscriptionPlans = [
  {
    id: "monthly" as const,
    name: "Monthly Plan",
    price: 299,
    currency: "INR",
    duration: "1 month",
    originalPrice: 399,
    discount: "25% OFF",
    popular: false,
    features: [
      "Access to all subjects",
      "HD video content",
      "Practice exercises",
      "Basic progress tracking",
      "Email support"
    ]
  },
  {
    id: "quarterly" as const,
    name: "Quarterly Plan",
    price: 799,
    currency: "INR",
    duration: "3 months",
    originalPrice: 1197,
    discount: "33% OFF",
    popular: true,
    features: [
      "Everything in Monthly",
      "Downloadable content",
      "Advanced analytics",
      "Priority support",
      "Study reminders",
      "Parent reports"
    ]
  },
  {
    id: "yearly" as const,
    name: "Yearly Plan",
    price: 2499,
    currency: "INR",
    duration: "12 months",
    originalPrice: 4788,
    discount: "48% OFF",
    popular: false,
    features: [
      "Everything in Quarterly",
      "Offline access",
      "1-on-1 doubt sessions",
      "Performance certificates",
      "Career guidance",
      "Free study materials"
    ]
  }
];