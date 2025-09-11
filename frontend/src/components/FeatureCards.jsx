import React from 'react';
import { 
  Code2, 
  Atom, 
  FileCode, 
  Database, 
  Palette, 
  Server,
  ArrowRight,
  Users,
  Clock,
  Star
} from 'lucide-react';

const FeatureCards = () => {
  const languages = [
    {
      id: 'javascript',
      name: 'JavaScript',
      description: 'Master the language of the web with interactive lessons and real-world projects.',
      icon: Code2,
      learners: '8,500+',
      lessons: '45',
      rating: 4.9,
      difficulty: 'Beginner Friendly',
      tags: ['ES6+', 'Async/Await', 'DOM Manipulation', 'APIs']
    },
    {
      id: 'react',
      name: 'React',
      description: 'Build dynamic user interfaces with the most popular frontend framework.',
      icon: Atom,
      learners: '6,200+',
      lessons: '38',
      rating: 4.8,
      difficulty: 'Intermediate',
      tags: ['Hooks', 'Components', 'State Management', 'JSX']
    },
    {
      id: 'python',
      name: 'Python',
      description: 'Learn the most versatile programming language for web, data science, and AI.',
      icon: FileCode,
      learners: '9,100+',
      lessons: '52',
      rating: 4.9,
      difficulty: 'Beginner Friendly',
      tags: ['Data Science', 'Web Development', 'Automation', 'AI/ML']
    },
    {
      id: 'typescript',
      name: 'TypeScript',
      description: 'Add type safety to JavaScript and build more robust applications.',
      icon: FileCode,
      learners: '4,300+',
      lessons: '28',
      rating: 4.7,
      difficulty: 'Intermediate',
      tags: ['Type Safety', 'Interfaces', 'Generics', 'Advanced JS']
    },
    {
      id: 'nodejs',
      name: 'Node.js',
      description: 'Build scalable backend applications and APIs with JavaScript.',
      icon: Server,
      learners: '5,700+',
      lessons: '35',
      rating: 4.8,
      difficulty: 'Intermediate',
      tags: ['Express.js', 'APIs', 'MongoDB', 'Authentication']
    },
    {
      id: 'css-tailwind',
      name: 'CSS & Tailwind',
      description: 'Master modern styling with CSS fundamentals and Tailwind utility classes.',
      icon: Palette,
      learners: '7,200+',
      lessons: '31',
      rating: 4.6,
      difficulty: 'Beginner Friendly',
      tags: ['Flexbox', 'Grid', 'Responsive', 'Utility-First']
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-6">
        
        {/* Section Header - Notion style */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Choose Your
            <span className="block text-blue-600">
              Learning Path
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed font-normal">
            Start with any programming language and let our AI adapt to your learning style. 
            Each path is designed to get you job-ready skills in just weeks, not months.
          </p>
        </div>

        {/* Feature Cards Grid - Notion card style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {languages.map((lang) => {
            const IconComponent = lang.icon;
            
            return (
              <div 
                key={lang.id}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-all duration-200 cursor-pointer group"
              >
                <div className="relative">
                  {/* Icon - Notion style */}
                  <div className="inline-flex p-2.5 bg-gray-100 rounded-md mb-4 group-hover:bg-gray-200 transition-colors duration-200">
                    <IconComponent className="h-5 w-5 text-gray-700" />
                  </div>

                  {/* Language Name */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {lang.name}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 leading-relaxed mb-4 text-sm">
                    {lang.description}
                  </p>

                  {/* Stats - Notion minimal style */}
                  <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {lang.learners}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {lang.lessons} lessons
                    </div>
                    <div className="flex items-center">
                      <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                      {lang.rating}
                    </div>
                  </div>

                  {/* Difficulty Badge - Notion style */}
                  <div className="mb-4">
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      lang.difficulty === 'Beginner Friendly' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {lang.difficulty}
                    </span>
                  </div>

                  {/* Tags - Notion style */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {lang.tags.slice(0, 3).map((tag, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {lang.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs text-gray-500">
                        +{lang.tags.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* CTA Button - Notion style */}
                  <button className="w-full flex items-center justify-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-md transition-colors duration-200 text-sm group-hover:bg-blue-600 group-hover:text-white">
                    Start Learning
                    <ArrowRight className="ml-2 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA - Notion style */}
        <div className="text-center">
          <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Not sure where to start?
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Take our 2-minute skills assessment and let our AI recommend the perfect learning path for your goals and experience level.
            </p>
            <button className="inline-flex items-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-200 text-sm">
              Take Skills Assessment
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureCards;