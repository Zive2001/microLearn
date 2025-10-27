/**
 * FAISSStatusBadge Component
 *
 * Displays FAISS system status and performance metrics
 * Shows whether FAISS is enabled or using fallback
 * Phase 4: Frontend system status indicator
 */

import { useState, useEffect } from 'react';
import { Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { apiClient } from '../services/api';

const FAISSStatusBadge = () => {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/faiss/status');

      if (response.data.success) {
        setStatus(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching FAISS status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async (e) => {
    e.preventDefault();
    setIsRefreshing(true);
    await fetchStatus();
    setIsRefreshing(false);
  };

  if (isLoading || !status) {
    return null; // Don't show badge while loading
  }

  const isAvailable = status.faissAvailable;
  const bgColor = isAvailable ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200';
  const textColor = isAvailable ? 'text-emerald-700' : 'text-amber-700';
  const iconColor = isAvailable ? 'text-emerald-600' : 'text-amber-600';
  const hoverColor = isAvailable ? 'hover:bg-emerald-100' : 'hover:bg-amber-100';

  return (
    <div className={`group relative inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${bgColor}`}>
      {isAvailable ? (
        <Zap className={`h-4 w-4 ${iconColor}`} />
      ) : (
        <AlertCircle className={`h-4 w-4 ${iconColor}`} />
      )}

      <span className={`text-xs font-medium ${textColor}`}>
        {isAvailable ? 'FAISS Enabled' : 'Using Fallback'}
      </span>

      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`ml-1 p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${hoverColor}`}
        title="Refresh FAISS status"
      >
        <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''} ${iconColor}`} />
      </button>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs py-2 px-3 rounded whitespace-nowrap z-50 pointer-events-none">
        {isAvailable
          ? 'AI-powered recommendations enabled for 200x faster searches'
          : 'Using standard search - recommendations still available'}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900"></div>
      </div>
    </div>
  );
};

export default FAISSStatusBadge;
