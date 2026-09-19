import React, { useState, useEffect } from 'react';
import { Factory } from 'lucide-react';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  customSrc?: string;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  imgClassName = '',
  size = 'md',
  customSrc,
  alt = 'لوگوی کیهان صنعت قائم',
}) => {
  const [imgStage, setImgStage] = useState<number>(0);

  useEffect(() => {
    setImgStage(0);
  }, [customSrc]);

  // Scaled up sizes without any confining borders or box frames
  const sizeClasses = {
    sm: 'h-8 w-auto max-h-8',
    md: 'h-12 md:h-14 w-auto max-h-14',
    lg: 'h-24 sm:h-28 md:h-32 w-auto max-h-32',
    xl: 'h-32 sm:h-40 w-auto max-h-40',
  }[size];

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  }[size];

  // Use /logo1.png directly as requested by the user
  const currentSource = () => {
    if (imgStage > 0) return null;
    if (customSrc) return customSrc;
    return '/logo1.png';
  };

  const handleImgError = () => {
    setImgStage((prev) => prev + 1);
  };

  const src = currentSource();

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 bg-transparent select-none ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          onError={handleImgError}
          className={`${sizeClasses} object-contain transition-transform duration-200 hover:scale-105 ${imgClassName}`}
          draggable={false}
        />
      ) : (
        <div className="flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <Factory className={iconSizes} />
        </div>
      )}
    </div>
  );
};
