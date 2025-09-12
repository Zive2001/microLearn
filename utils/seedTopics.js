// utils/seedTopics.js
const mongoose = require('mongoose');
const Topic = require('../models/Topic');
require('dotenv').config();

const topics = [
    {
        name: 'JavaScript',
        slug: 'javascript',
        description: 'Learn the fundamentals of JavaScript programming language, including ES6+ features, DOM manipulation, and modern JavaScript concepts.',
        category: 'Programming Languages',
        difficulty: 'All Levels',
        estimatedDuration: '4-6 weeks',
        prerequisites: [],
        tags: ['programming', 'web development', 'frontend', 'backend'],
        icon: '⚡',
        color: '#F7DF1E',
        learningObjectives: [
            'Understand JavaScript syntax and basic programming concepts',
            'Master ES6+ features like arrow functions, destructuring, and modules',
            'Learn DOM manipulation and event handling',
            'Understand asynchronous programming with Promises and async/await'
        ],
        skillsGained: [
            'JavaScript Programming',
            'DOM Manipulation',
            'Event Handling',
            'Asynchronous Programming',
            'ES6+ Features'
        ],
        popularity: 100,
        featured: true
    },
    {
        name: 'React',
        slug: 'react',
        description: 'Master React.js library for building modern, interactive user interfaces with components, hooks, and state management.',
        category: 'Frameworks & Libraries',
        difficulty: 'Intermediate',
        estimatedDuration: '6-8 weeks',
        prerequisites: [
            {
                topicName: 'JavaScript',
                level: 'Intermediate'
            }
        ],
        tags: ['react', 'frontend', 'ui', 'components', 'jsx'],
        icon: '⚛️',
        color: '#61DAFB',
        learningObjectives: [
            'Build reusable UI components with React',
            'Manage application state with hooks',
            'Handle user interactions and events',
            'Implement routing with React Router',
            'Optimize React applications for performance'
        ],
        skillsGained: [
            'React Components',
            'JSX',
            'React Hooks',
            'State Management',
            'React Router',
            'Component Lifecycle'
        ],
        popularity: 95,
        featured: true
    },
    {
        name: 'TypeScript',
        slug: 'typescript',
        description: 'Learn TypeScript to add static typing to JavaScript projects, improving code quality and developer experience.',
        category: 'Programming Languages',
        difficulty: 'Intermediate',
        estimatedDuration: '3-4 weeks',
        prerequisites: [
            {
                topicName: 'JavaScript',
                level: 'Basic'
            }
        ],
        tags: ['typescript', 'types', 'javascript', 'static typing'],
        icon: '🔷',
        color: '#3178C6',
        learningObjectives: [
            'Understand TypeScript type system',
            'Add type annotations to JavaScript code',
            'Use interfaces and type aliases',
            'Work with generics and advanced types',
            'Configure TypeScript compiler'
        ],
        skillsGained: [
            'Static Typing',
            'Type Annotations',
            'Interfaces',
            'Generics',
            'TypeScript Configuration'
        ],
        popularity: 85,
        featured: true
    },
    {
        name: 'Node.js',
        slug: 'nodejs',
        description: 'Build server-side applications with Node.js, including APIs, databases, and backend services.',
        category: 'Backend Development',
        difficulty: 'Intermediate',
        estimatedDuration: '5-7 weeks',
        prerequisites: [
            {
                topicName: 'JavaScript',
                level: 'Intermediate'
            }
        ],
        tags: ['nodejs', 'backend', 'server', 'api', 'express'],
        icon: '🟢',
        color: '#339933',
        learningObjectives: [
            'Build REST APIs with Express.js',
            'Handle file system operations',
            'Work with databases and ORMs',
            'Implement authentication and authorization',
            'Deploy Node.js applications'
        ],
        skillsGained: [
            'Server-side Programming',
            'REST API Development',
            'Express.js',
            'Database Integration',
            'Authentication'
        ],
        popularity: 80,
        featured: true
    },
    {
        name: 'Python',
        slug: 'python',
        description: 'Learn Python programming for web development, data science, automation, and general-purpose programming.',
        category: 'Programming Languages',
        difficulty: 'All Levels',
        estimatedDuration: '5-8 weeks',
        prerequisites: [],
        tags: ['python', 'programming', 'data science', 'automation', 'web development'],
        icon: '🐍',
        color: '#3776AB',
        learningObjectives: [
            'Master Python syntax and core concepts',
            'Work with data structures and algorithms',
            'Build web applications with frameworks',
            'Perform data analysis and visualization',
            'Automate tasks with Python scripts'
        ],
        skillsGained: [
            'Python Programming',
            'Data Structures',
            'Web Development',
            'Data Analysis',
            'Automation',
            'Object-Oriented Programming'
        ],
        popularity: 90,
        featured: true
    },
    {
        name: 'Next.js',
        slug: 'nextjs',
        description: 'Build full-stack React applications with Next.js framework, including SSR, API routes, and optimization.',
        category: 'Frameworks & Libraries',
        difficulty: 'Advanced',
        estimatedDuration: '4-6 weeks',
        prerequisites: [
            {
                topicName: 'React',
                level: 'Intermediate'
            }
        ],
        tags: ['nextjs', 'react', 'fullstack', 'ssr', 'api routes'],
        icon: '▲',
        color: '#000000',
        learningObjectives: [
            'Build full-stack applications with Next.js',
            'Implement server-side rendering and static generation',
            'Create API routes and backend functionality',
            'Optimize applications for performance',
            'Deploy Next.js applications'
        ],
        skillsGained: [
            'Next.js Framework',
            'Server-side Rendering',
            'Static Site Generation',
            'API Routes',
            'Full-stack Development'
        ],
        popularity: 75,
        featured: false
    },
    {
        name: 'MongoDB',
        slug: 'mongodb',
        description: 'Learn NoSQL database management with MongoDB, including data modeling, queries, and aggregation.',
        category: 'Tools & Technologies',
        difficulty: 'Intermediate',
        estimatedDuration: '3-4 weeks',
        prerequisites: [],
        tags: ['mongodb', 'database', 'nosql', 'data modeling'],
        icon: '🍃',
        color: '#47A248',
        learningObjectives: [
            'Design NoSQL database schemas',
            'Perform CRUD operations',
            'Write complex queries and aggregations',
            'Implement database indexing',
            'Connect databases to applications'
        ],
        skillsGained: [
            'NoSQL Database Design',
            'MongoDB Queries',
            'Data Aggregation',
            'Database Indexing',
            'Database Integration'
        ],
        popularity: 70,
        featured: false
    },
    {
        name: 'CSS & Tailwind',
        slug: 'css-tailwind',
        description: 'Master modern CSS techniques and Tailwind CSS framework for responsive and beautiful web designs.',
        category: 'Frontend Development',
        difficulty: 'All Levels',
        estimatedDuration: '4-5 weeks',
        prerequisites: [],
        tags: ['css', 'tailwind', 'styling', 'responsive design', 'frontend'],
        icon: '🎨',
        color: '#38B2AC',
        learningObjectives: [
            'Master CSS fundamentals and advanced techniques',
            'Build responsive layouts with Flexbox and Grid',
            'Use Tailwind CSS for rapid UI development',
            'Implement animations and transitions',
            'Optimize CSS for performance'
        ],
        skillsGained: [
            'CSS Fundamentals',
            'Responsive Design',
            'Tailwind CSS',
            'CSS Animations',
            'UI Design'
        ],
        popularity: 65,
        featured: false
    }
];

const seedTopics = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        // Clear existing topics
        await Topic.deleteMany({});
        console.log('Cleared existing topics');
        
        // Insert new topics
        const createdTopics = await Topic.insertMany(topics);
        console.log(`✅ Created ${createdTopics.length} topics`);
        
        // Update prerequisites with actual ObjectIds
        for (const topic of createdTopics) {
            if (topic.prerequisites && topic.prerequisites.length > 0) {
                const updatedPrerequisites = [];
                
                for (const prereq of topic.prerequisites) {
                    const prerequisiteTopic = await Topic.findOne({ 
                        slug: prereq.topicName.toLowerCase().replace(/\s+/g, '') 
                    });
                    
                    if (prerequisiteTopic) {
                        updatedPrerequisites.push({
                            topicId: prerequisiteTopic._id,
                            topicName: prerequisiteTopic.name,
                            level: prereq.level
                        });
                    }
                }
                
                if (updatedPrerequisites.length > 0) {
                    await Topic.findByIdAndUpdate(topic._id, {
                        prerequisites: updatedPrerequisites
                    });
                }
            }
        }
        
        console.log('✅ Updated topic prerequisites');
        console.log('🎉 Topics seeding completed successfully!');
        
        // Display created topics
        const finalTopics = await Topic.find({}).select('name slug category featured');
        console.log('\n📚 Created Topics:');
        finalTopics.forEach(topic => {
            console.log(`  - ${topic.name} (${topic.slug}) [${topic.category}] ${topic.featured ? '⭐' : ''}`);
        });
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error seeding topics:', error);
        process.exit(1);
    }
};

// Run the seeding function
if (require.main === module) {
    seedTopics();
}

module.exports = seedTopics;