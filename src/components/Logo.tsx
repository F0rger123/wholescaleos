interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 32, className = '', showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className="flex items-center justify-center rounded-[25%] text-white shrink-0 shadow-lg shadow-indigo-600/20"
        style={{ 
          width: size, 
          height: size,
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)'
        }}
      >
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '70%', height: '70%' }}
        >
          <path 
            d="M30 70 L30 45 L50 30 L70 45 L70 70 Z" 
            fill="white"
          />
          <path 
            d="M45 70 L45 55 L55 55 L55 70 Z" 
            fill="#6366f1"
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col">
          <h1 className="text-xl font-black leading-tight tracking-[-0.05em] whitespace-nowrap italic uppercase text-[var(--t-text)]">
            WholeScale
          </h1>
          <p className="text-[10px] uppercase font-black tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Operating System
          </p>
        </div>
      )}
    </div>
  );
}
