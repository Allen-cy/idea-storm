import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
    duration?: number; // 自动关闭时间（毫秒）
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 5000 }) => {
    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose]);

    const getBackgroundColor = () => {
        switch (type) {
            case 'success':
                return 'var(--color-yellow)';
            case 'error':
                return '#FF4444';
            case 'info':
                return 'var(--color-black)';
            default:
                return 'var(--color-black)';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'info':
                return 'ℹ';
            default:
                return '';
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 3000,
                animation: 'fadeIn 0.3s ease-out',
            }}
        >
            <div
                className="glass"
                style={{
                    backgroundColor: getBackgroundColor(),
                    color: type === 'success' ? 'var(--color-black)' : 'var(--color-white)',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    minWidth: '300px',
                    maxWidth: '500px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                }}
            >
                <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                    {getIcon()}
                </span>
                <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>
                    {message}
                </span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'inherit',
                        fontSize: '18px',
                        cursor: 'pointer',
                        padding: '0 4px',
                        opacity: 0.7,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
                >
                    ×
                </button>
            </div>
        </div>
    );
};

export default Toast;
