import React, { useState, useRef, useEffect } from 'react';

interface InputBoxProps {
    onSubmit: (text: string) => void;
}

const InputBox: React.FC<InputBoxProps> = ({ onSubmit }) => {
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
                bottom: '40px',
                zIndex: 1000,
                width: '100%',
                maxWidth: '600px',
                padding: '0 20px',
                boxSizing: 'border-box',
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
                        width: '100%',
                        border: '2px solid var(--color-black)',
                        boxSizing: 'border-box',
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
                            width: '100%',
                            minWidth: '0',
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
                            flexShrink: 0,
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
