interface CarelitoProps {
  className?: string;
  variant?: "standard" | "doctor";
  expression?: "happy" | "confident" | "excited" | "thoughtful";
}

export function Carelito({ className, variant = "standard", expression = "happy" }: CarelitoProps) {
  const mouthPath = {
    happy: "M69.8 90.4c4.7 5.4 13.2 5.4 18 0",
    confident: "M69.8 91.4c5.2 3.4 12.8 3.4 18 0",
    excited: "M70.2 88.7c3.6 8.2 13.1 8.2 17.2 0",
    thoughtful: "M70.4 92.8c4.8-2.2 11.2-2.2 16 0",
  }[expression];

  return (
    <div className={className} aria-hidden="true" data-mascot="carelito">
      <svg
        viewBox="0 0 160 160"
        className="h-full w-full drop-shadow-[0_18px_30px_rgba(47,103,96,0.18)]"
      >
        <defs>
          <linearGradient id="heartMascotGradient" x1="30" y1="26" x2="132" y2="140">
            <stop stopColor="#61d3c0" />
            <stop offset="0.52" stopColor="#2f8fc8" />
            <stop offset="1" stopColor="#204f4a" />
          </linearGradient>
          <linearGradient id="heartMascotFace" x1="50" y1="50" x2="116" y2="126">
            <stop stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="1" stopColor="#eef8f5" />
          </linearGradient>
        </defs>
        <path
          d="M81.5 134.5C61.2 120.4 33 98.2 25.6 73.8 19.9 55 30.8 36 49.7 33.1c12.2-1.9 22.1 4.8 29.2 15.1C86 37.9 96 31.2 108.2 33.1c18.9 2.9 29.8 21.9 24.1 40.7-7.4 24.4-35.6 46.6-50.8 60.7Z"
          fill="url(#heartMascotGradient)"
        />
        <path
          d="M53.8 78.6c0-17.3 11.2-31.4 25-31.4s25 14.1 25 31.4S92.6 110 78.8 110s-25-14.1-25-31.4Z"
          fill="url(#heartMascotFace)"
          opacity="0.96"
        />
        {variant === "doctor" && (
          <path
            d="M47.5 105.6c8.3 9.3 18.9 18 34 28.9 8.3-7.7 18.3-16.1 26.9-25.2l-11.8-7.4-15.1 12.8-15.7-13.2-18.3 4.1Z"
            fill="#ffffff"
            opacity="0.94"
          />
        )}
        <circle cx="69" cy="77" r="4.1" fill="#10201f" />
        <circle cx="89.3" cy="77" r="4.1" fill="#10201f" />
        <path d={mouthPath} fill="none" stroke="#10201f" strokeLinecap="round" strokeWidth="5" />
        {expression === "thoughtful" && (
          <path
            d="M104.4 53.8c7.2-3.8 15.1 1 14.8 8.2-.3 6.2-5.4 8.8-9.5 11.7-2.8 2-4 3.9-4 6.8"
            fill="none"
            stroke="#10201f"
            strokeLinecap="round"
            strokeWidth="4"
            opacity="0.72"
          />
        )}
        <path
          d="M45.4 53.4c-10.7 11.8-10.6 31.4 4.7 47.7M112.8 54.2c11.4 11.8 11.2 31.9-4.8 47.4"
          fill="none"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeWidth="6"
          opacity="0.35"
        />
        <path
          d="M41.8 108.4c-14.3 13.5-10.2 28.8 7.4 30.5 15.8 1.5 24.2-6.7 24.8-17.3"
          fill="none"
          stroke="#204f4a"
          strokeLinecap="round"
          strokeWidth="6"
        />
        <circle cx="75.2" cy="119.4" r="8.4" fill="#e8f5ef" stroke="#204f4a" strokeWidth="5" />
        <circle cx="46.6" cy="137.8" r="5.6" fill="#2f8fc8" />
        <path
          d="M124.2 105.6c7.4 4.7 12.4 11.9 12.4 20.1 0 14.1-14.7 25.5-32.8 25.5-12.2 0-22.8-5.1-28.5-12.7"
          fill="none"
          stroke="#2f8fc8"
          strokeLinecap="round"
          strokeWidth="5"
          opacity="0.55"
        />
        <circle cx="137.2" cy="126.1" r="6.5" fill="#10201f" />
      </svg>
    </div>
  );
}

export function HeartMascot(props: CarelitoProps) {
  return <Carelito {...props} />;
}
