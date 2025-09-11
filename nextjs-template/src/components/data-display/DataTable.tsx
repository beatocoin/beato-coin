"use client"

import React from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalTrigger
} from '@/components/ui/modal'

// Define a generic type for table columns
interface TableColumn {
  key: string;
  title: string;
  render?: (value: any, record: any) => React.ReactNode;
  width?: string;
  priority?: number; // Priority for mobile view (1 = highest, should always show)
  mobileLabel?: string; // Optional custom label for mobile card view
}

// Interface for a YouTube video from API response
interface YouTubeVideoDetails {
  kind?: string;
  etag?: string;
  id?: string;
  snippet?: {
    publishedAt?: string;
    channelId?: string;
    title?: string;
    description?: string;
    thumbnails?: {
      default?: { url: string; width: number; height: number };
      medium?: { url: string; width: number; height: number };
      high?: { url: string; width: number; height: number };
      standard?: { url: string; width: number; height: number };
      maxres?: { url: string; width: number; height: number };
    };
    channelTitle?: string;
    categoryId?: string;
    liveBroadcastContent?: string;
    localized?: {
      title?: string;
      description?: string;
    };
    defaultAudioLanguage?: string;
  };
  contentDetails?: {
    duration?: string;
    dimension?: string;
    definition?: string;
    caption?: string;
    licensedContent?: boolean;
    contentRating?: Record<string, any>;
    projection?: string;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    favoriteCount?: string;
    commentCount?: string;
  };
}

// Interface for a formatted video with processed data
interface FormattedVideoDetails {
  videoId: string;
  id: string;
  title?: string;
  channelTitle?: string;
  channelId?: string;
  description?: string;
  thumbnails?: any;
  statistics?: any;
  viewCount?: string;
  likeCount?: string;
  commentCount?: string;
  snippet?: any;
}

interface DataTableProps {
  data: any[];
  columns: TableColumn[];
  className?: string;
  tableClassName?: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  className = '',
  tableClassName = ''
}) => {
  return (
    <div className={`w-full overflow-x-auto rounded-lg ${className}`}>
      {/* Standard table view (hidden on small screens) */}
      <table className={`w-full hidden md:table ${tableClassName}`}>
        <thead className="bg-gray-100">
          <tr>
            {columns.map((column) => (
              <th 
                key={column.key} 
                className="px-4 py-3 text-left text-sm font-medium text-gray-700 align-middle"
                style={column.width ? { width: column.width } : {}}
              >
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {data.map((record, index) => (
            <tr key={index} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td key={`${index}-${column.key}`} className="px-4 py-3 text-sm align-middle">
                  {column.render 
                    ? column.render(record[column.key], record) 
                    : record[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile card view (visible only on small screens) */}
      <div className="md:hidden space-y-4">
        {data.map((record, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            {columns.map((column) => (
              // Skip columns with priority > 3 to focus on important data
              (column.priority === undefined || column.priority <= 3) && (
                <div key={`mobile-${index}-${column.key}`} className="py-2">
                  {column.title !== 'Video' && (
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      {column.mobileLabel || column.title}
                    </div>
                  )}
                  <div className="text-sm">
                    {column.render 
                      ? column.render(record[column.key], record) 
                      : record[column.key]}
                  </div>
                </div>
              )
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// YouTube videos table component
interface YouTubeVideosTableProps {
  videos: any[];
  className?: string;
}

// Helper to create YouTube embed code from videoId
const createEmbedCode = (videoId: string) => {
  return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
};

// Factory function to determine which table to display based on data format
interface DataDisplayProps {
  data: any;
  className?: string;
}

export const DataDisplay: React.FC<DataDisplayProps> = ({ data, className = '' }) => {
  console.log('DataDisplay received data:', data);
  
  // Handle error response in message field
  if (data?.message?.error) {
    return (
      <div className={`data-display-container bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 ${className}`}>
        <p className="font-medium">Error</p>
        <p>{data.message.error}</p>
      </div>
    );
  }
  
  // Handle error response wrapped in an array
  if (Array.isArray(data) && data.length === 1 && data[0]?.message?.error) {
    return (
      <div className={`data-display-container bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 ${className}`}>
        <p className="font-medium">Error</p>
        <p>{data[0].message.error}</p>
      </div>
    );
  }
  
  // Handle getVideoDetails with format { "videoId": { details } }
  if (data?.tool_name === 'getVideoDetails' && typeof data.message === 'object' && !Array.isArray(data.message)) {
    // Convert the object with videoId keys to an array for our component
    const videosArray = Object.entries(data.message).map(([videoId, details]) => {
      const videoDetails = details as YouTubeVideoDetails;
      
      // Create a formatted video object with proper typing
      const formattedVideo: FormattedVideoDetails = {
        videoId,
        id: videoId,
        title: videoDetails.snippet?.title,
        channelTitle: videoDetails.snippet?.channelTitle,
        channelId: videoDetails.snippet?.channelId,
        description: videoDetails.snippet?.description,
        thumbnails: videoDetails.snippet?.thumbnails,
        statistics: videoDetails.statistics,
        viewCount: videoDetails.statistics?.viewCount,
        likeCount: videoDetails.statistics?.likeCount,
        commentCount: videoDetails.statistics?.commentCount,
        snippet: videoDetails.snippet
      };
      
      return formattedVideo;
    });
    return <div className="data-display-container"><MultipleVideoDetailsDisplay videos={videosArray} className={className} /></div>;
  }
  
  // Handle array-wrapped getVideoDetails response
  if (Array.isArray(data) && data.length === 1 && data[0]?.tool_name === 'getVideoDetails') {
    const innerData = data[0];
    
    // Handle case where message is directly an object with videoId keys
    if (typeof innerData.message === 'object' && !Array.isArray(innerData.message)) {
      // Convert the object with videoId keys to an array for our component
      const videosArray = Object.entries(innerData.message).map(([videoId, details]) => {
        const videoDetails = details as YouTubeVideoDetails;
        
        // Create a formatted video object with proper typing
        const formattedVideo: FormattedVideoDetails = {
          videoId,
          id: videoId,
          title: videoDetails.snippet?.title,
          channelTitle: videoDetails.snippet?.channelTitle,
          channelId: videoDetails.snippet?.channelId,
          description: videoDetails.snippet?.description,
          thumbnails: videoDetails.snippet?.thumbnails,
          statistics: videoDetails.statistics,
          viewCount: videoDetails.statistics?.viewCount,
          likeCount: videoDetails.statistics?.likeCount,
          commentCount: videoDetails.statistics?.commentCount,
          snippet: videoDetails.snippet
        };
        
        return formattedVideo;
      });
      return <div className="data-display-container"><MultipleVideoDetailsDisplay videos={videosArray} className={className} /></div>;
    }
  }
  
  // Handle getVideoDetails response - object format with videoId keys (previous format)
  if (data?.tool_name === 'getVideoDetails' && data?.message?.items) {
    // Check if items is an object with videoId keys (not an array)
    if (!Array.isArray(data.message.items) && typeof data.message.items === 'object') {
      // Convert the object items to an array for our component
      const videosArray = Object.entries(data.message.items).map(([videoId, details]) => {
        const videoDetails = details as YouTubeVideoDetails;
        
        // Create a formatted video object with proper typing
        const formattedVideo: FormattedVideoDetails = {
          videoId,
          id: videoId,
          title: videoDetails.snippet?.title,
          channelTitle: videoDetails.snippet?.channelTitle,
          channelId: videoDetails.snippet?.channelId,
          description: videoDetails.snippet?.description,
          thumbnails: videoDetails.snippet?.thumbnails,
          statistics: videoDetails.statistics,
          viewCount: videoDetails.statistics?.viewCount,
          likeCount: videoDetails.statistics?.likeCount,
          commentCount: videoDetails.statistics?.commentCount,
          snippet: videoDetails.snippet
        };
        
        return formattedVideo;
      });
      return <div className="data-display-container"><MultipleVideoDetailsDisplay videos={videosArray} className={className} /></div>;
    }
    // If items is already an array, use it directly
    return <div className="data-display-container"><MultipleVideoDetailsDisplay videos={data.message.items} className={className} /></div>;
  }
  
  // Try alternate structure for getVideoDetails in array format (previous format)
  if (Array.isArray(data) && data[0]?.tool_name === 'getVideoDetails') {
    if (data[0]?.message?.items) {
      // Check if items is an object with videoId keys (not an array)
      if (!Array.isArray(data[0].message.items) && typeof data[0].message.items === 'object') {
        // Convert the object items to an array for our component
        const videosArray = Object.entries(data[0].message.items).map(([videoId, details]) => {
          const videoDetails = details as YouTubeVideoDetails;
          
          // Create a formatted video object with proper typing
          const formattedVideo: FormattedVideoDetails = {
            videoId,
            id: videoId,
            title: videoDetails.snippet?.title,
            channelTitle: videoDetails.snippet?.channelTitle,
            channelId: videoDetails.snippet?.channelId,
            description: videoDetails.snippet?.description,
            thumbnails: videoDetails.snippet?.thumbnails,
            statistics: videoDetails.statistics,
            viewCount: videoDetails.statistics?.viewCount,
            likeCount: videoDetails.statistics?.likeCount,
            commentCount: videoDetails.statistics?.commentCount,
            snippet: videoDetails.snippet
          };
          
          return formattedVideo;
        });
        return <div className="data-display-container"><MultipleVideoDetailsDisplay videos={videosArray} className={className} /></div>;
      }
      // If items is already an array, use it directly
      return <div className="data-display-container"><MultipleVideoDetailsDisplay videos={data[0].message.items} className={className} /></div>;
    }
  }
  
  // Handle YouTube search results - new format with items array and nested snippet
  if (data?.tool_name === 'searchVideos' && data?.message?.items) {
    // Map the data to a format that matches the table component expectations
    const formattedVideos = data.message.items.map((item: any) => ({
      videoId: item.id?.videoId,
      title: item.snippet?.title,
      channelTitle: item.snippet?.channelTitle,
      publishedAt: item.snippet?.publishedAt,
      description: item.snippet?.description,
      thumbnail: item.snippet?.thumbnails?.high?.url,
      // Include the original item for reference
      snippet: item.snippet
    }));
    return (
      <div className={`data-display-container ${className}`}>
        <YouTubeVideosTable videos={formattedVideos} />
        <div className="mt-4 text-sm text-gray-600 italic p-2 border-t border-gray-200 pt-3">
          If you would like additional information on any of these videos, you can ask a question with the Video ID.
        </div>
      </div>
    );
  }
  
  // Handle responses wrapped in an array at the top level
  if (Array.isArray(data) && data.length === 1 && data[0]?.tool_name === 'searchVideos') {
    // Extract the inner object from the array
    const innerData = data[0];
    
    // Handle when message is an array directly
    if (Array.isArray(innerData.message)) {
      return (
        <div className={`data-display-container ${className}`}>
          <YouTubeVideosTable videos={innerData.message} />
          <div className="mt-4 text-sm text-gray-600 italic p-2 border-t border-gray-200 pt-3">
            If you would like additional information on any of these videos, you can ask a question with the Video ID.
          </div>
        </div>
      );
    }
    
    // Handle other message formats if present inside the array-wrapped object
    // If innerData.message.items exists
    if (innerData.message?.items) {
      const formattedVideos = innerData.message.items.map((item: any) => ({
        videoId: item.id?.videoId,
        title: item.snippet?.title,
        channelTitle: item.snippet?.channelTitle,
        publishedAt: item.snippet?.publishedAt,
        description: item.snippet?.description,
        thumbnail: item.snippet?.thumbnails?.high?.url,
        snippet: item.snippet
      }));
      return (
        <div className={`data-display-container ${className}`}>
          <YouTubeVideosTable videos={formattedVideos} />
          <div className="mt-4 text-sm text-gray-600 italic p-2 border-t border-gray-200 pt-3">
            If you would like additional information on any of these videos, you can ask a question with the Video ID.
          </div>
        </div>
      );
    }
    
    // If innerData.message.videos exists
    if (innerData.message?.videos) {
      return (
        <div className={`data-display-container ${className}`}>
          <YouTubeVideosTable videos={innerData.message.videos} />
          <div className="mt-4 text-sm text-gray-600 italic p-2 border-t border-gray-200 pt-3">
            If you would like additional information on any of these videos, you can ask a question with the Video ID.
          </div>
        </div>
      );
    }
  }
  
  // Handle YouTube search results - old format
  if (data?.tool_name === 'searchVideos' && data?.message?.videos) {
    return (
      <div className={`data-display-container ${className}`}>
        <YouTubeVideosTable videos={data.message.videos} />
        <div className="mt-4 text-sm text-gray-600 italic p-2 border-t border-gray-200 pt-3">
          If you would like additional information on any of these videos, you can ask a question with the Video ID.
        </div>
      </div>
    );
  }
  
  // Handle case where message is directly an array of videos
  if (data?.tool_name === 'searchVideos' && Array.isArray(data.message)) {
    return (
      <div className={`data-display-container ${className}`}>
        <YouTubeVideosTable videos={data.message} />
        <div className="mt-4 text-sm text-gray-600 italic p-2 border-t border-gray-200 pt-3">
          If you would like additional information on any of these videos, you can ask a question with the Video ID.
        </div>
      </div>
    );
  }
  
  // Try alternate structure that might be used in the API response
  if (Array.isArray(data) && data[0]?.tool_name === 'searchVideos') {
    if (data[0]?.message?.items) {
      // Map the data to a format that matches the table component expectations
      const formattedVideos = data[0].message.items.map((item: any) => ({
        videoId: item.id?.videoId,
        title: item.snippet?.title,
        channelTitle: item.snippet?.channelTitle,
        publishedAt: item.snippet?.publishedAt,
        description: item.snippet?.description,
        thumbnail: item.snippet?.thumbnails?.high?.url,
        // Include the original item for reference
        snippet: item.snippet
      }));
      return (
        <div className={`data-display-container ${className}`}>
          <YouTubeVideosTable videos={formattedVideos} />
          <div className="mt-4 text-sm text-gray-600 italic p-2 border-t border-gray-200 pt-3">
            If you would like additional information on any of these videos, you can ask a question with the Video ID.
          </div>
        </div>
      );
    }
    if (data[0]?.message?.videos) {
      return (
        <div className={`data-display-container ${className}`}>
          <YouTubeVideosTable videos={data[0].message.videos} />
          <div className="mt-4 text-sm text-gray-600 italic p-2 border-t border-gray-200 pt-3">
            If you would like additional information on any of these videos, you can ask a question with the Video ID.
          </div>
        </div>
      );
    }
    // Handle case where message is directly an array of videos
    if (Array.isArray(data[0].message)) {
      return (
        <div className={`data-display-container ${className}`}>
          <YouTubeVideosTable videos={data[0].message} />
          <div className="mt-4 text-sm text-gray-600 italic p-2 border-t border-gray-200 pt-3">
            If you would like additional information on any of these videos, you can ask a question with the Video ID.
          </div>
        </div>
      );
    }
  }
  
  // For unknown data formats, just display as JSON
  return (
    <div className={`data-display-container bg-gray-50 p-4 rounded ${className}`}>
      <pre className="text-sm overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

// Video Details component for getVideoDetails response
interface VideoDetailsProps {
  video: any;
  className?: string;
}

export const VideoDetailsDisplay: React.FC<VideoDetailsProps> = ({
  video,
  className = ''
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const videoId = video.videoId || video.id;
  const thumbnailUrl = video.thumbnails?.medium?.url || 
                       video.snippet?.thumbnails?.medium?.url || 
                       `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  
  const description = video.description || video.snippet?.description || '';
  const descriptionPreview = description.length > 200 
    ? description.substring(0, 200) + '...'
    : description;
  
  // Format numbers with commas
  const formatNumber = (num: string | undefined) => {
    if (!num) return 'N/A';
    return new Intl.NumberFormat().format(parseInt(num));
  };
  
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1"><strong>Channel:</strong> {video.channelTitle || video.snippet?.channelTitle} - {video.channelId || video.snippet?.channelId}</p>
        <h2 className="text-xl font-bold mb-4">{video.title || video.snippet?.title}</h2>
      </div>
      
      <div className="video-embed-wrapper mb-6">
        <div className="embed-container video-details-embed">
          <div dangerouslySetInnerHTML={{ __html: createEmbedCode(videoId) }} />
        </div>
      </div>
      
      {/* Updated statistics grid with a more specific class name */}
      <div className="video-stats-grid mb-6">
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <p className="text-sm font-medium text-gray-500">View Count</p>
          <p className="text-xl font-bold">{formatNumber(video.viewCount || video.statistics?.viewCount)}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <p className="text-sm font-medium text-gray-500">Like Count</p>
          <p className="text-xl font-bold">{formatNumber(video.likeCount || video.statistics?.likeCount)}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <p className="text-sm font-medium text-gray-500">Comment Count</p>
          <p className="text-xl font-bold">{formatNumber(video.commentCount || video.statistics?.commentCount)}</p>
        </div>
      </div>
      
      <div className="flex md:flex-row flex-col gap-4">
        <div className="md:w-1/3 w-full">
          <img 
            src={thumbnailUrl} 
            alt={video.title || video.snippet?.title} 
            className="w-full h-auto rounded-lg"
            width={320}
            height={180}
          />
        </div>
        <div className="md:w-2/3 w-full">
          <p className="text-gray-700">
            {showFullDescription ? description : descriptionPreview}
            {description.length > 200 && (
              <Button 
                variant="link" 
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="ml-1 p-0 h-auto text-blue-600 hover:text-blue-800"
              >
                {showFullDescription ? 'Show Less' : 'Expanded Description'}
              </Button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

// Multiple Video Details component for displaying multiple videos
interface MultipleVideoDetailsProps {
  videos: any[];
  className?: string;
}

export const MultipleVideoDetailsDisplay: React.FC<MultipleVideoDetailsProps> = ({
  videos,
  className = ''
}) => {
  return (
    <div className={`space-y-8 ${className}`}>
      {videos.map((video, index) => (
        <VideoDetailsDisplay key={index} video={video} />
      ))}
    </div>
  );
};

// YouTube Videos Table component
export const YouTubeVideosTable: React.FC<YouTubeVideosTableProps> = ({ 
  videos,
  className = ''
}) => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  const columns: TableColumn[] = [
    {
      key: 'video_button',
      title: 'Video',
      width: '50%',
      priority: 1, // Highest priority - always show
      render: (_, record) => (
        <Modal>
          <ModalTrigger asChild>
            <Button 
              onClick={() => setSelectedVideo(record.videoId || record.id?.videoId)}
              className="bg-red-600 hover:bg-red-700 text-white w-full md:w-auto py-3 md:py-2"
            >
              Watch Video
            </Button>
          </ModalTrigger>
          <ModalContent className="max-w-4xl w-[95vw] md:w-auto">
            <ModalHeader>
              <ModalTitle>{record.title || record.snippet?.title}</ModalTitle>
            </ModalHeader>
            <div className="embed-container">
              <div dangerouslySetInnerHTML={{ 
                __html: createEmbedCode(record.videoId || record.id?.videoId)
              }} />
            </div>
          </ModalContent>
        </Modal>
      )
    },
    {
      key: 'title',
      title: 'Video Title',
      width: '20%',
      priority: 1, // Highest priority - always show
      mobileLabel: 'Title',
      render: (title, record) => record.title || record.snippet?.title
    },
    {
      key: 'video_id',
      title: 'Video ID',
      width: '10%',
      priority: 3, // Lower priority for mobile
      mobileLabel: 'ID',
      render: (_, record) => record.videoId || record.id?.videoId
    },
    {
      key: 'channelTitle',
      title: 'Channel',
      width: '10%',
      priority: 2, // Medium priority for mobile
      mobileLabel: 'Channel',
      render: (channelTitle, record) => channelTitle || record.snippet?.channelTitle
    }
  ]

  return (
    <div className={className}>
      <DataTable 
        data={videos} 
        columns={columns}
        tableClassName="border-collapse bg-white"
      />
    </div>
  )
}

// Default export - the factory function
export default DataDisplay 