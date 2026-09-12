import React from 'react';

interface SkeletonLoaderProps {
  height?: string;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  height = 'h-32',
  className = ''
}) => {
  return (
    <div
      className={`w-full ${height} neu-inset rounded-3xl animate-pulse ${className}`}
    />
  );
};

export default SkeletonLoader;
