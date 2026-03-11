/**
 * ExternalVideo Component
 * 
 * Renders a local video player used in the documentation and dashboard.
 * The video file is bundled as a static asset by Vite for reliable serving.
 */
import React from 'react';
import tutorialVideo from '../assets/tutorial.mp4';

const ExternalVideo = () => {
  return (
    <div className="docs-video-container">
      <video 
        controls 
        width="100%" 
        height="100%"
        style={{ borderRadius: '12px', display: 'block', backgroundColor: '#000' }}
      >
        <source src={tutorialVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default ExternalVideo;