import React from 'react';
import { 
  Star, 
  Quote, 
  CheckCircle, 
  TrendingUp,
  Users,
  BookOpen,
  Trophy,
  Globe
} from 'lucide-react';

const SocialProof = () => {
  const testimonials = [
    {
      id: 1,
      name: 'Sarah Chen',
      role: 'Frontend Developer',
      company: 'Google',
      avatar: '/avatars/sarah.jpg',
      rating: 5,
      text: "MicroLearn's bite-sized approach helped me transition from marketing to tech in just 4 months. The AI recommendations were spot-on for my learning style.",
      course: 'JavaScript → React',
      outcome: 'Landed job at Google'
    },
    {
      id: 2,
      name: 'Marcus Rodriguez',
      role: 'Full Stack Developer',
      company: 'Stripe',
      avatar: '/avatars/marcus.jpg',
      rating: 5,
      text: "I was skeptical about 5-minute lessons, but the consistency and quality blew me away. Perfect for busy professionals like me.",
      course: 'Python → Node.js',
      outcome: '40% salary increase'
    },
    {
      id: 3,
      name: 'Emma Thompson',
      role: 'Software Engineer',
      company: 'Microsoft',
      avatar: '/avatars/emma.jpg',
      rating: 5,
      text: "The adaptive learning system knew exactly what I needed to work on. It's like having a personal coding tutor available 24/7.",
      course: 'TypeScript → Advanced React',
      outcome: 'Promoted to Senior Engineer'
    }
  ];

  const stats = [
    {
      icon: Users,
      value: '10,000+',
      label: 'Active Learners',
      sublabel: 'Growing daily'
    },
    {
      icon: BookOpen,
      value: '250+',
      label: 'Learning Modules',
      sublabel: 'Constantly updated'
    },
    {
      icon: Trophy,
      value: '95%',
      label: 'Success Rate',
      sublabel: 'Complete courses'
    },
    {
      icon: Globe,
      value: '50+',
      label: 'Countries',
      sublabel: 'Worldwide reach'
    }
  ];

  const achievements = [
    'Featured in TechCrunch',
    'Winner: Best EdTech 2024',
    'Y Combinator Graduate',
    'Backed by leading VCs'
  ];

  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        
        {/* Stats Section - Notion style */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Join Thousands of
            <span className="block text-blue-600">
              Successful Learners
            </span>
          </h2>
          
          {/* Stats Grid - Notion minimal style */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg mb-3">
                    <IconComponent className="h-6 w-6 text-gray-700" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-base font-medium text-gray-900 mb-1">
                    {stat.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {stat.sublabel}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Achievements - Notion style badges */}
          <div className="flex flex-wrap justify-center gap-3">
            {achievements.map((achievement, index) => (
              <div 
                key={index}
                className="flex items-center px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-md"
              >
                <CheckCircle className="h-3 w-3 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">{achievement}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials - Notion card style */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              What Our Learners Say
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Real stories from developers who transformed their careers with MicroLearn
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div 
                key={testimonial.id}
                className="bg-gray-50 border border-gray-200 rounded-lg p-6 relative"
              >
                {/* Quote Icon - Notion style */}
                <div className="absolute -top-2 left-6">
                  <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                    <Quote className="h-3 w-3 text-white" />
                  </div>
                </div>

                {/* Rating - Notion minimal */}
                <div className="flex items-center mb-3 pt-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 text-yellow-500 fill-current" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="text-gray-800 leading-relaxed mb-4 text-sm">
                  "{testimonial.text}"
                </p>

                {/* Course & Outcome - Notion style */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center">
                    <BookOpen className="h-3 w-3 text-blue-600 mr-2" />
                    <span className="text-xs text-gray-600">Path: {testimonial.course}</span>
                  </div>
                  <div className="flex items-center">
                    <TrendingUp className="h-3 w-3 text-green-600 mr-2" />
                    <span className="text-xs text-green-700 font-medium">{testimonial.outcome}</span>
                  </div>
                </div>

                {/* Author */}
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center mr-3">
                    <img 
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-full h-full rounded-lg object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="hidden w-full h-full rounded-lg bg-blue-600 items-center justify-center text-white font-semibold text-sm">
                      {testimonial.name.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{testimonial.name}</div>
                    <div className="text-xs text-gray-600">
                      {testimonial.role} at {testimonial.company}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Success Stories Banner - Notion style */}
        <div className="bg-blue-600 rounded-lg p-8 md:p-10 text-center text-white relative overflow-hidden">
          {/* Notion-style subtle decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full transform -translate-x-12 translate-y-12"></div>
          
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">
              Ready to Write Your Success Story?
            </h3>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Join thousands of learners who've transformed their careers with just 5 minutes a day. 
              Your future self will thank you.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button className="px-6 py-2.5 bg-white text-blue-600 font-medium rounded-md hover:bg-gray-100 transition-colors duration-200">
                Start Your Journey
              </button>
              <div className="flex items-center text-blue-100 text-sm">
                <CheckCircle className="h-4 w-4 mr-2" />
                <span>No credit card required</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;