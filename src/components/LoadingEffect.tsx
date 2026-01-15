import React from 'react';

interface LoadingEffectProps {
    x: number;
    y: number;
}

const LoadingEffect: React.FC<LoadingEffectProps> = ({ x, y }) => {
    return (
        <g>
            {/* 呼吸灯效果 */}
            <circle
                cx={x}
                cy={y}
                r="40"
                fill="var(--color-yellow)"
                opacity="0.3"
                style={{
                    animation: 'breathing 1.5s ease-in-out infinite'
                }}
            />
            <circle
                cx={x}
                cy={y}
                r="30"
                fill="var(--color-yellow)"
                opacity="0.5"
                style={{
                    animation: 'breathing 1.5s ease-in-out infinite',
                    animationDelay: '0.3s'
                }}
            />
            <circle
                cx={x}
                cy={y}
                r="20"
                fill="var(--color-yellow)"
                opacity="0.7"
                style={{
                    animation: 'breathing 1.5s ease-in-out infinite',
                    animationDelay: '0.6s'
                }}
            />

            {/* 中心点 */}
            <circle
                cx={x}
                cy={y}
                r="10"
                fill="var(--color-black)"
            />
        </g>
    );
};

export default LoadingEffect;
