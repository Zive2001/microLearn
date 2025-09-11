import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../hooks/useAuth';
import { getTopicMeta, formatNumber, formatDuration } from '../utils/helpers';
import { microlearningService } from '../services/microlearning';
import { 
  Play as PlayIcon, 
  Clock as ClockIcon, 
  Star as StarIcon,
  Filter as FilterIcon,
  Search as SearchIcon,
  ExternalLink as ExternalLinkIcon,
  TrendingUp as TrendingUpIcon,
  BookOpen as BookOpenIcon,
  Target as TargetIcon,
  ArrowLeft as ArrowLeftIcon
} from 'lucide-react';
import Loading from '../components/Loading';
import toast from 'react-hot-toast';

const VideoRecommendations = () => {
  const { topic } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { selectedTopics, fetchRecommendations } = useApp();
  
  const [videos, setVideos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState(searchParams.get('level') || 'all');
  const [isLoading, setIsLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(null);

  // Get topic metadata
  const topicMeta = topic ? getTopicMeta(topic) : null;

  // Get user's level for this topic
  const userTopicData = selectedTopics?.find(t => t.topic === topic);

  useEffect(() => {
    if (userTopicData) {
      setUserLevel(userTopicData.knowledgeLevel);
    }
  }, [userTopicData]);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!topic) return;
      
      try {
        setIsLoading(true);
        
        // Use backend service to get recommendations
        const recommendations = await microlearningService.getRecommendations(topic, {
          maxVideos: 20,
          includeAlternative: true
        });
        
        setVideos(recommendations.videos || []);
      } catch (error) {
        console.error('Error loading recommendations:', error);
        toast.error('Failed to load video recommendations');
        
        // Fallback to mock data
        setVideos([
          {
            id: 'mock-1',
            title: `${topicMeta?.name || topic} Fundamentals for Beginners`,
            description: `Learn the basics of ${topicMeta?.name || topic} programming`,
            url: '#',
            thumbnail: null,
            duration: '12:34',
            channelTitle: 'Programming Tutorial',
            viewCount: 45000,
            score: 8.5,
            level: 'Beginner',
            tags: ['basics', 'tutorial']
          },
          {
            id: 'mock-2',
            title: `Advanced ${topicMeta?.name || topic} Concepts`,
            description: `Deep dive into advanced ${topicMeta?.name || topic} techniques`,
            url: '#',
            thumbnail: null,
            duration: '18:45',
            channelTitle: 'Advanced Coding',
            viewCount: 23000,
            score: 9.2,
            level: 'Advanced',
            tags: ['advanced', 'concepts']
          },
          {
            id: 'mock-3',
            title: `${topicMeta?.name || topic} Best Practices`,
            description: `Industry best practices for ${topicMeta?.name || topic} development`,
            url: '#',
            thumbnail: null,
            duration: '15:20',
            channelTitle: 'Professional Dev',
            viewCount: 38000,
            score: 8.8,
            level: 'Intermediate',
            tags: ['best-practices', 'industry']
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendations();
  }, [topic, topicMeta]);

  // Filter videos based on search and level
  const filteredVideos = videos.filter(video => {
    const matchesSearch = !searchQuery || 
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.channelTitle?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLevel = levelFilter === 'all' || video.level === levelFilter;
    
    return matchesSearch && matchesLevel;
  });

  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
      case 'professional':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8.5) return 'text-green-600';
    if (score >= 7.5) return 'text-blue-600';
    if (score >= 6.5) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const handleVideoClick = (video) => {
    if (video.url && video.url !== '#') {
      window.open(video.url, '_blank', 'noopener,noreferrer');
    } else {
      toast.info('Video will open when available');
    }
  };

  if (isLoading) {
    return <Loading fullScreen text="Loading personalized recommendations..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/app/topics"
              className="flex items-center text-[#6B6B6B] hover:text-[#2383E2] transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Topics
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-start space-x-4">
          {topicMeta && (
            <div className="text-4xl">{topicMeta.icon}</div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-[#37352F] mb-2">
              {topicMeta?.name || topic} Video Recommendations
            </h1>
            <p className="text-lg text-[#6B6B6B] mb-4">
              AI-curated videos matched to your skill level and learning goals
            </p>

            {/* User Level & Stats */}
            <div className="flex items-center space-x-6">
              {userLevel && (
                <div className="flex items-center space-x-2">
                  <TargetIcon className="h-5 w-5 text-[#6B6B6B]" />
                  <span className="text-sm text-[#6B6B6B]">Your Level:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLevelColor(userLevel)}`}>
                    {userLevel}
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <BookOpenIcon className="h-5 w-5 text-[#6B6B6B]" />
                <span className="text-sm text-[#6B6B6B]">
                  {filteredVideos.length} videos available
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#6B6B6B]" />
            <input
              type="text"
              placeholder="Search videos, channels, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#E9E9E7] rounded-lg focus:outline-none focus:ring-0 focus:border-[#2383E2] text-sm"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <FilterIcon className="h-5 w-5 text-[#6B6B6B] mr-2" />
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="border border-[#E9E9E7] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-0 focus:border-[#2383E2] bg-white"
              >
                <option value="all">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Professional">Professional</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] p-12 text-center">
          <div className="w-16 h-16 bg-[#6B6B6B]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlayIcon className="h-8 w-8 text-[#6B6B6B]" />
          </div>
          <h3 className="text-lg font-medium text-[#37352F] mb-2">No videos found</h3>
          <p className="text-[#6B6B6B] mb-6">
            Try adjusting your search criteria or explore different skill levels.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setLevelFilter('all');
            }}
            className="inline-flex items-center px-4 py-2 bg-[#2383E2] text-white rounded-lg hover:bg-[#0F62FE] transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-xl shadow-sm border border-[#E9E9E7] overflow-hidden hover:shadow-md transition-all cursor-pointer group"
              onClick={() => handleVideoClick(video)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-100">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#2383E2] to-[#0F62FE]">
                  <PlayIcon className="h-12 w-12 text-white/80 group-hover:text-white transition-colors" />
                </div>
                
                {/* Duration & Score Overlay */}
                <div className="absolute top-2 right-2 flex space-x-2">
                  {video.score && (
                    <div className="bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center">
                      <StarIcon className="h-3 w-3 mr-1 text-yellow-400" />
                      {video.score.toFixed(1)}
                    </div>
                  )}
                </div>
                
                <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
                  {video.duration}
                </div>
              </div>
              
              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-[#37352F] line-clamp-2 flex-1 group-hover:text-[#2383E2] transition-colors">
                    {video.title}
                  </h3>
                  <div className="ml-2 flex-shrink-0">
                    <ExternalLinkIcon className="h-4 w-4 text-[#6B6B6B] group-hover:text-[#2383E2] transition-colors" />
                  </div>
                </div>
                
                <p className="text-xs text-[#6B6B6B] mb-3 line-clamp-2">
                  {video.description}
                </p>

                {/* Channel & Level */}
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[#6B6B6B] font-medium">
                    {video.channelTitle}
                  </p>
                  {video.level && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getLevelColor(video.level)}`}>
                      {video.level}
                    </span>
                  )}
                </div>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                  <div className="flex items-center space-x-3">
                    {video.viewCount && (
                      <span>{formatNumber(video.viewCount)} views</span>
                    )}
                    {video.score && (
                      <div className="flex items-center">
                        <TrendingUpIcon className="h-3 w-3 mr-1" />
                        <span className={getScoreColor(video.score)}>
                          Match: {Math.round(video.score * 10)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {video.tags && video.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {video.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#F7F6F3] text-[#6B6B6B]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations Section */}
      {userLevel && (
        <div className="bg-gradient-to-br from-[#2383E2] to-[#0F62FE] rounded-xl p-8 text-white">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <TargetIcon className="h-6 w-6" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2">
                Personalized for Your {userLevel} Level
              </h3>
              <p className="text-blue-100 mb-4 leading-relaxed">
                These videos are specifically curated based on your assessment results. 
                Focus on content that matches your current skill level and learning objectives.
              </p>
              <div className="flex items-center space-x-4">
                <Link
                  to={`/app/assessment/${topic}`}
                  className="inline-flex items-center px-4 py-2 bg-white text-[#2383E2] rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Retake Assessment
                </Link>
                <Link
                  to="/app/dashboard"
                  className="inline-flex items-center px-4 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-white/30 transition-colors text-sm"
                >
                  View Progress
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoRecommendations;