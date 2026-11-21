import { useState } from 'react';
import { CarFront } from 'lucide-react';

interface VehicleImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function VehicleImage({ src, alt, className = '' }: VehicleImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EAE6DC] via-[#F4F2EC] to-[#E2DDD2] dark:from-[#171C28] dark:via-[#11151E] dark:to-[#090B10] text-[#8E6B23] dark:text-[#D4AF62] p-3 ${className}`}
      >
        <CarFront className="w-8 h-8 mb-1 opacity-85" />
        <span className="text-[11px] font-semibold text-center leading-tight line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
