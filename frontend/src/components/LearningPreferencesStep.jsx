import React from 'react';
import { Target, Clock, Calendar, Brain, BookOpen, Code2, Database, Palette, Server, Smartphone, AlertCircle } from 'lucide-react';

const LearningPreferencesStep = ({ formData, setFormData, errors }) => {
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayToggle = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field]?.includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...(prev[field] || []), value]
    }));
  };

  // Backend expects these exact learning goal values
  const learningGoals = [
    { value: 'career_change', label: 'Career Change', description: 'Transition to tech career' },
    { value: 'skill_improvement', label: 'Skill Enhancement', description: 'Enhance current skills' },
    { value: 'hobby', label: 'Personal Interest', description: 'Learning for fun' },
    { value: 'academic', label: 'Academic Requirements', description: 'For school or university' },
  ];

  const programmingTopics = [
    { value: 'javascript', label: 'JavaScript', icon: Code2, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'react', label: 'React', icon: Code2, color: 'bg-blue-100 text-blue-800' },
    { value: 'python', label: 'Python', icon: Code2, color: 'bg-green-100 text-green-800' },
    { value: 'typescript', label: 'TypeScript', icon: Code2, color: 'bg-blue-100 text-blue-800' },
    { value: 'nodejs', label: 'Node.js', icon: Server, color: 'bg-green-100 text-green-800' },
    { value: 'css', label: 'CSS/Tailwind', icon: Palette, color: 'bg-pink-100 text-pink-800' },
    { value: 'database', label: 'Databases', icon: Database, color: 'bg-purple-100 text-purple-800' },
    { value: 'mobile', label: 'Mobile Dev', icon: Smartphone, color: 'bg-indigo-100 text-indigo-800' },
  ];

  const timeCommitments = [
    { value: '5-10', label: '5-10 minutes/day', description: 'Quick daily sessions' },
    { value: '15-30', label: '15-30 minutes/day', description: 'Short focused learning' },
    { value: '30-60', label: '30-60 minutes/day', description: 'Dedicated study time' },
    { value: '60+', label: '1+ hours/day', description: 'Intensive learning' },
  ];

  const learningStyles = [
    { value: 'visual', label: 'Visual', description: 'Learn with diagrams and videos', icon: BookOpen },
    { value: 'hands_on', label: 'Hands-on', description: 'Learn by coding projects', icon: Code2 },
    { value: 'reading', label: 'Reading', description: 'Learn through documentation', icon: BookOpen },
    { value: 'interactive', label: 'Interactive', description: 'Quizzes and challenges', icon: Brain },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Learning Preferences
        </h2>
        <p className="text-gray-600">
          Customize your learning experience to match your goals
        </p>
      </div>

      <div className="space-y-8">
        {/* Learning Goals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Target className="inline h-4 w-4 mr-2" />
            What's your primary learning goal?
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {learningGoals.map((goal) => (
              <label key={goal.value} className="flex items-start cursor-pointer">
                <input
                  type="radio"
                  name="learningGoal"
                  value={goal.value}
                  checked={formData.learningGoal === goal.value}
                  onChange={(e) => handleInputChange('learningGoal', e.target.value)}
                  className="mt-1 h-4 w-4 text-gray-900 border-gray-300 focus:ring-gray-900 focus:ring-2"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">
                    {goal.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {goal.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {errors.learningGoal && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.learningGoal}
            </div>
          )}
        </div>

        {/* Topics of Interest */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Code2 className="inline h-4 w-4 mr-2" />
            Which programming topics interest you? (Select multiple)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {programmingTopics.map((topic) => {
              const IconComponent = topic.icon;
              const isSelected = formData.interestedTopics?.includes(topic.value);
              
              return (
                <button
                  key={topic.value}
                  type="button"
                  onClick={() => handleArrayToggle('interestedTopics', topic.value)}
                  className={`
                    p-3 rounded-md border-2 transition-all duration-200 text-center
                    ${isSelected 
                      ? 'border-gray-900 bg-gray-50 text-gray-800' 
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }
                  `}
                >
                  <IconComponent className="h-5 w-5 mx-auto mb-2" />
                  <div className="text-sm font-medium">{topic.label}</div>
                </button>
              );
            })}
          </div>
          {errors.interestedTopics && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.interestedTopics}
            </div>
          )}
        </div>

        {/* Time Commitment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Clock className="inline h-4 w-4 mr-2" />
            How much time can you commit daily?
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {timeCommitments.map((time) => (
              <label key={time.value} className="flex items-start cursor-pointer">
                <input
                  type="radio"
                  name="timeCommitment"
                  value={time.value}
                  checked={formData.timeCommitment === time.value}
                  onChange={(e) => handleInputChange('timeCommitment', e.target.value)}
                  className="mt-1 h-4 w-4 text-gray-900 border-gray-300 focus:ring-gray-900 focus:ring-2"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">
                    {time.label}
                  </div>
                  <div className="text-sm text-gray-500">
                    {time.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
          {errors.timeCommitment && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.timeCommitment}
            </div>
          )}
        </div>

        {/* Learning Style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Brain className="inline h-4 w-4 mr-2" />
            How do you prefer to learn?
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {learningStyles.map((style) => {
              const IconComponent = style.icon;
              return (
                <label key={style.value} className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    name="learningStyle"
                    value={style.value}
                    checked={formData.learningStyle === style.value}
                    onChange={(e) => handleInputChange('learningStyle', e.target.value)}
                    className="mt-1 h-4 w-4 text-gray-900 border-gray-300 focus:ring-gray-900 focus:ring-2"
                  />
                  <div className="ml-3 flex items-start">
                    <IconComponent className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {style.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {style.description}
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          {errors.learningStyle && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.learningStyle}
            </div>
          )}
        </div>

        {/* Preferred Schedule */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Calendar className="inline h-4 w-4 mr-2" />
            When do you prefer to learn? (Select multiple)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Morning', 'Afternoon', 'Evening', 'Night'].map((time) => {
              const isSelected = formData.preferredSchedule?.includes(time.toLowerCase());
              
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => handleArrayToggle('preferredSchedule', time.toLowerCase())}
                  className={`
                    p-3 rounded-md border-2 transition-all duration-200 text-center
                    ${isSelected 
                      ? 'border-gray-900 bg-gray-50 text-gray-800' 
                      : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                    }
                  `}
                >
                  <div className="text-sm font-medium">{time}</div>
                </button>
              );
            })}
          </div>
          {errors.preferredSchedule && (
            <div className="flex items-center mt-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.preferredSchedule}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Learning Reminders</h3>
              <p className="text-sm text-gray-500">Get notified about your daily learning goals</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enableNotifications || false}
                onChange={(e) => handleInputChange('enableNotifications', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                formData.enableNotifications ? 'bg-gray-900' : 'bg-gray-200'
              }`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 transform ${
                  formData.enableNotifications ? 'translate-x-6 mt-1 ml-1' : 'translate-x-1 mt-1'
                }`}></div>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningPreferencesStep;