import React, { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';

interface CountdownClockProps {
  endDate: Date;
}

function getTimeRemaining(endDate: Date) {
  const total = endDate.getTime() - new Date().getTime();
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
}

const CountdownClock: React.FC<CountdownClockProps> = ({ endDate }) => {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(endDate));
  const { colors } = useTheme();

  useEffect(() => {
    if (timeLeft.total <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(endDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [endDate, timeLeft.total]);

  if (timeLeft.total <= 0) return null;

  return (
    <div className="flex flex-col items-center justify-center py-8 w-full">
      <div
        className="rounded-xl shadow-lg mb-4 w-full max-w-xl md:max-w-[800px]"
        style={{
          background: colors.secondary,
          border: `2px solid ${colors.accent1}`,
          padding: '25px',
        }}
      >
        <h2 className="text-2xl md:text-3xl font-bold mb-2 text-center" style={{ color: colors.primary }}>
          Token Sale Countdown
        </h2>
        <div
          className="grid grid-cols-2 grid-rows-2 gap-4 justify-center text-center text-3xl md:text-4xl font-mono mb-[50px] md:flex md:grid-cols-none md:grid-rows-none"
        >
          {/* Days */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #d8d8d8',
              borderRadius: '12px',
              minWidth: '60px',
              padding: '0 25px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: colors.accent1 }}>{timeLeft.days}</span>
            <div className="text-xs md:text-sm text-gray-500">Days</div>
          </div>
          {/* Hours */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #d8d8d8',
              borderRadius: '12px',
              minWidth: '60px',
              padding: '0 25px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: colors.accent1 }}>{String(timeLeft.hours).padStart(2, '0')}</span>
            <div className="text-xs md:text-sm text-gray-500">Hours</div>
          </div>
          {/* Minutes */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #d8d8d8',
              borderRadius: '12px',
              minWidth: '60px',
              padding: '0 25px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: colors.accent1 }}>{String(timeLeft.minutes).padStart(2, '0')}</span>
            <div className="text-xs md:text-sm text-gray-500">Minutes</div>
          </div>
          {/* Seconds */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #d8d8d8',
              borderRadius: '12px',
              minWidth: '60px',
              padding: '0 25px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: colors.accent1 }}>{String(timeLeft.seconds).padStart(2, '0')}</span>
            <div className="text-xs md:text-sm text-gray-500">Seconds</div>
          </div>
        </div>
        <div className="text-left text-sm md:text-lg mt-2" style={{ color: colors.dark }}>
          {`Beato Coin will be available for purchase ${format(endDate, 'MMMM do, yyyy')}. `}
          <span style={{ color: colors.accent1, fontWeight: 600, whiteSpace: 'nowrap' }}>Create a wallet now</span> to be eligible for AirDrops and additional pre-launch benefits!
        </div>
      </div>
    </div>
  );
};

export default CountdownClock; 