import React, { useState } from 'react';
import { HistoryEntry } from '../types';

interface HistoryPanelProps {
    history: HistoryEntry[];
    onRestore: (entry: HistoryEntry) => void;
    onClear: () => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onRestore, onClear }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 1000,
            }}
        >
            {/* 切换按钮 */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="glass"
                style={{
                    padding: '12px 20px',
                    borderRadius: '25px',
                    backgroundColor: 'var(--color-black)',
                    color: 'var(--color-yellow)',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    border: '2px solid var(--color-yellow)',
                }}
            >
                {isExpanded ? '关闭历史' : '历史记录'}
            </button>

            {/* 历史记录面板 */}
            {isExpanded && (
                <div
                    className="glass"
                    style={{
                        marginTop: '10px',
                        padding: '20px',
                        borderRadius: '16px',
                        width: '300px',
                        maxHeight: '500px',
                        overflowY: 'auto',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '2px solid var(--color-black)',
                        animation: 'fadeIn 0.3s ease-out',
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3
                            style={{
                                fontSize: '16px',
                                fontWeight: 'bold',
                                color: 'var(--color-black)',
                                margin: 0,
                            }}
                        >
                            历史记录
                        </h3>
                        {history.length > 0 && (
                            <button
                                onClick={onClear}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#ff4d4f',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(255, 77, 79, 0.1)',
                                }}
                            >
                                🗑️ 清空
                            </button>
                        )}
                    </div>

                    {history.length === 0 ? (
                        <p style={{ color: 'var(--color-light-gray)', fontSize: '14px' }}>
                            暂无历史记录
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {history.slice().reverse().map((entry) => (
                                <button
                                    key={entry.id}
                                    onClick={() => {
                                        onRestore(entry);
                                        setIsExpanded(false);
                                    }}
                                    style={{
                                        padding: '12px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                        textAlign: 'left',
                                        transition: 'all 0.2s',
                                        border: '1px solid rgba(0, 0, 0, 0.1)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
                                        e.currentTarget.style.transform = 'translateX(-4px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
                                        e.currentTarget.style.transform = 'translateX(0)';
                                    }}
                                >
                                    <div
                                        style={{
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            color: 'var(--color-black)',
                                            marginBottom: '4px',
                                        }}
                                    >
                                        {entry.rootText}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: 'var(--color-light-gray)',
                                        }}
                                    >
                                        {formatTime(entry.timestamp)} · {entry.nodes.length} 个节点
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HistoryPanel;
