import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import {
  CheckCircle2 as CheckCircleIcon,
  Circle as CircleIcon,
  BookOpen as BookOpenIcon,
  ArrowRight as ArrowRightIcon,
  Sparkles as SparklesIcon,
  Filter as FilterIcon,
  Search as SearchIcon,
  Clock,
  Star,
  Users,
  TrendingUp
} from 'lucide-react';
import StackIcon from 'tech-stack-icons';
import { getTopicIconName, getTopicColor } from '../utils/helpers';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const TopicSelection = () => {
  const { user, isAuthenticated } = useAuth();
  const { 
    allTopics, 
    selectedTopics, 
    isLoading, 
    fetchAllTopics, 
    fetchSelectedTopics,
    selectTopics 
  } = useApp();
  const navigate = useNavigate();
  
  const [selectedForLearning, setSelectedForLearning] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    fetchAllTopics();
    if (isAuthenticated) {
      fetchSelectedTopics();
    }
  }, [isAuthenticated]);

  // Handle backend response format
  const displayTopics = Array.isArray(allTopics) 
    ? allTopics.flat() 
    : allTopics?.data 
      ? allTopics.data.flatMap(categoryGroup => 
          (categoryGroup.topics || []).map(topic => ({
            ...topic,
            category: categoryGroup._id
          }))
        )
      : [];


  // Filter topics based on search and category
  const filteredTopics = displayTopics.filter(topic => {
    const matchesSearch = topic.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         topic.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         topic.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || topic.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Group topics by category
  const topicsByCategory = filteredTopics.reduce((groups, topic) => {
    const category = topic.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(topic);
    return groups;
  }, {});

  // Get unique categories from the backend response
  const categories = ['all'];
  if (allTopics?.data) {
    categories.push(...allTopics.data.map(group => group._id));
  }

  // Check if topic is already selected
  const isTopicSelected = (topicSlug) => {
    return selectedTopics.some(topic => topic.slug === topicSlug || topic.topic === topicSlug);
  };

  // Handle topic selection for learning
  const toggleTopicSelection = (topicSlug) => {
    const newSelected = new Set(selectedForLearning);
    if (newSelected.has(topicSlug)) {
      newSelected.delete(topicSlug);
    } else {
      newSelected.add(topicSlug);
    }
    setSelectedForLearning(newSelected);
  };

  // Submit selected topics
  const handleSelectTopics = async () => {
    if (selectedForLearning.size === 0) {
      toast.error('Please select at least one topic');
      return;
    }

    try {
      setIsSelecting(true);
      await selectTopics(Array.from(selectedForLearning));
      toast.success(`${selectedForLearning.size} topic${selectedForLearning.size > 1 ? 's' : ''} added to your learning path!`);
      navigate('/app/dashboard');
    } catch (error) {
      toast.error('Failed to select topics. Please try again.');
    } finally {
      setIsSelecting(false);
    }
  };

  if (isLoading && displayTopics.length === 0) {
    return <Loading fullScreen text="Loading topics..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-[#37352F] mb-2">
            Choose Your Learning Topics
          </h1>
          <p className="text-lg text-[#6B6B6B] mb-6">
            Select programming topics you want to master. We'll assess your skills and provide personalized recommendations.
          </p>
          
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6B6B6B]" />
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#E9E9E7] rounded-lg focus:outline-none focus:ring-0 focus:border-[#212529] text-sm"
              />
            </div>
            <div className="relative">
              <FilterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6B6B6B]" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-[#E9E9E7] rounded-lg focus:outline-none focus:ring-0 focus:border-[#212529] text-sm bg-white"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Selection Summary */}
      {selectedForLearning.size > 0 && (
        <div className="bg-[#212529]/10 rounded-xl border border-[#212529]/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#37352F] font-medium">
                {selectedForLearning.size} topic{selectedForLearning.size > 1 ? 's' : ''} selected
              </p>
              <p className="text-sm text-[#6B6B6B]">
                Ready to start your personalized learning journey?
              </p>
            </div>
            <button
              onClick={handleSelectTopics}
              disabled={isSelecting}
              className="inline-flex items-center px-6 py-3 bg-[#212529] text-white rounded-lg hover:bg-[#495057] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSelecting ? 'Adding Topics...' : 'Add to Learning Path'}
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Topics by Category */}
      {Object.keys(topicsByCategory).length === 0 ? (
        <div className="text-center py-12">
          <BookOpenIcon className="h-16 w-16 text-[#6B6B6B] mx-auto mb-4" />
          <h3 className="text-lg font-medium text-[#37352F] mb-2">No topics found</h3>
          <p className="text-[#6B6B6B]">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        Object.entries(topicsByCategory).map(([category, topics]) => (
          <div key={category} className="space-y-4">
            <h2 className="text-xl font-semibold text-[#37352F] border-b border-[#E9E9E7] pb-2">
              {category}
            </h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {topics.map((topic) => {
                const isSelected = isTopicSelected(topic.slug);
                const isSelectedForLearning = selectedForLearning.has(topic.slug);
                
                return (
                  <div
                    key={topic.slug}
                    className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                      isSelectedForLearning 
                        ? 'border-[#212529] bg-[#212529]/5' 
                        : 'border-[#E9E9E7] hover:border-[#D3D3D1]'
                    }`}
                    onClick={() => !isSelected && toggleTopicSelection(topic.slug)}
                  >
                    {/* Topic Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                          <StackIcon name={getTopicIconName(topic.slug)} variant="dark" className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-[#37352F]">
                              {topic.name}
                            </h3>
                            {topic.featured && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <p className="text-sm text-[#6B6B6B] mb-3 line-clamp-2">{topic.description}</p>
                          
                          {/* Topic Metadata */}
                          <div className="flex items-center gap-4 text-xs text-[#6B6B6B]">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{topic.estimatedDuration}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3" />
                              <span>{topic.difficulty}</span>
                            </div>
                            {topic.totalLearners > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                <span>{topic.totalLearners.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTopicSelection(topic.slug);
                          }}
                          className="flex-shrink-0 p-1 rounded-md hover:bg-[#F7F6F3] transition-colors"
                        >
                          {isSelectedForLearning ? (
                            <CheckCircleIcon className="h-6 w-6 text-[#212529]" />
                          ) : (
                            <CircleIcon className="h-6 w-6 text-[#6B6B6B] hover:text-[#212529] transition-colors" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Tags */}
                    {topic.tags && topic.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {topic.tags.slice(0, 3).map((tag, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-[#F7F6F3] text-[#6B6B6B] text-xs rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                        {topic.tags.length > 3 && (
                          <span className="px-2 py-1 bg-[#F7F6F3] text-[#6B6B6B] text-xs rounded-md">
                            +{topic.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* Status */}
                    {isSelected && (
                      <div className="mb-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                          ✓ Added to Learning Path
                        </span>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex space-x-2">
                      {isSelected ? (
                        <>
                          <Link
                            to={`/app/assessment/${topic.slug}`}
                            className="flex-1 bg-[#212529] text-white text-center px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#495057] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Take Assessment
                          </Link>
                          <Link
                            to={`/app/recommendations/${topic.slug}`}
                            className="flex-1 bg-white border border-[#E9E9E7] text-[#37352F] text-center px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#F7F6F3] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Videos
                          </Link>
                        </>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTopicSelection(topic.slug);
                          }}
                          className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isSelectedForLearning
                              ? 'bg-[#212529] text-white hover:bg-[#495057] shadow-sm'
                              : 'bg-white border border-[#E9E9E7] text-[#37352F] hover:bg-[#F7F6F3] hover:border-[#D3D3D1]'
                          }`}
                        >
                          {isSelectedForLearning ? (
                            <span className="flex items-center justify-center gap-2">
                              <CheckCircleIcon className="h-4 w-4" />
                              Selected
                            </span>
                          ) : (
                            'Select Topic'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Help Section */}
      <div className="bg-gradient-to-br from-[#212529] to-[#495057] rounded-xl p-8 text-white">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <SparklesIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2">
              Get Personalized Recommendations
            </h3>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Not sure which topics to choose? Our AI can analyze your interests and recommend the perfect learning path for your goals.
            </p>
            <Link
              to="/app/assessment"
              className="inline-flex items-center px-6 py-3 bg-white text-[#212529] rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Get AI Recommendations
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopicSelection;