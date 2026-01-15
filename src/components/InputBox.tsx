import React, { useState, useRef, useEffect } from 'react';

interface InputBoxProps {
    onSubmit: (text: string) => void;
    isAtBottom: boolean;
}

const InputBox: React.FC<InputBoxProps> = ({ onSubmit, isAtBottom }) => {
    const [text, setText] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // 自动聚焦
        inputRef.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onSubmit(text.trim());
            setText('');
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                left: '50%',
                transform: 'translateX(-50%)',
                transition: 'bottom 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                bottom: isAtBottom ? '40px' : '50%',
                zIndex: 1000,
            }}
        >
            <form onSubmit={handleSubmit}>
                <div
                    className="glass"
                    style={{
                        borderRadius: '50px',
                        padding: '16px 32px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        minWidth: '400px',
                        border: '2px solid var(--color-black)',
                    }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="输入词语开始创意发散..."
                        style={{
                            flex: 1,
                            fontSize: '16px',
                            color: 'var(--color-black)',
                            fontWeight: '500',
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--color-black)',
                            color: 'var(--color-yellow)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            fontWeight: 'bold',
                        }}
                    >
                        →
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InputBox;
