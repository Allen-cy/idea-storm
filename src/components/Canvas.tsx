import React, { useState, useRef, useEffect } from 'react';
import { Node, Connection } from '../types';
import LoadingEffect from './LoadingEffect';

interface CanvasProps {
    nodes: Node[];
    connections: Connection[];
    onNodeClick: (nodeId: string) => void;
    onNodeRightClick: (nodeId: string) => void;
    loadingNodeId: string | null;
}

interface Transform {
    x: number;
    y: number;
    scale: number;
}

const Canvas: React.FC<CanvasProps> = ({
    nodes,
    connections,
    onNodeClick,
    onNodeRightClick,
    loadingNodeId,
}) => {
    const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const svgRef = useRef<SVGSVGElement>(null);

    // 文字自动换行
    const wrapText = (text: string, maxChars: number = 6): string[] => {
        const lines: string[] = [];
        for (let i = 0; i < text.length; i += maxChars) {
            lines.push(text.slice(i, i + maxChars));
        }
        return lines;
    };

    // 获取节点大小
    const getNodeSize = (node: Node): number => {
        if (node.level === 0 || node.isSelected) {
            return 120;
        }
        return 80;
    };

    const handleNodeRightClick = (e: React.MouseEvent, nodeId: string) => {
        e.preventDefault();
        onNodeRightClick(nodeId);
    };

    // 处理缩放 (滚轮)
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const zoomSpeed = 0.001;
        const delta = -e.deltaY;
        const newScale = Math.min(Math.max(transform.scale + delta * zoomSpeed, 0.2), 3);

        if (newScale === transform.scale) return;

        // 计算缩放中心（鼠标位置）
        if (svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // 保持鼠标指向的点在缩放前后比例一致
            const factor = newScale / transform.scale;
            const newX = mouseX - (mouseX - transform.x) * factor;
            const newY = mouseY - (mouseY - transform.y) * factor;

            setTransform({ x: newX, y: newY, scale: newScale });
        }
    };

    // 处理拖拽开始
    const handleMouseDown = (e: React.MouseEvent) => {
        // 只有点击背景（SVG本身）才触发拖拽
        if (e.target === svgRef.current) {
            setIsDragging(true);
            setLastMousePos({ x: e.clientX, y: e.clientY });
        }
    };

    // 处理拖拽移动
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                const dx = e.clientX - lastMousePos.x;
                const dy = e.clientY - lastMousePos.y;
                setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
                setLastMousePos({ x: e.clientX, y: e.clientY });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, lastMousePos]);

    // 重置视图
    const resetView = () => {
        setTransform({ x: 0, y: 0, scale: 1 });
    };

    return (
        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                style={{
                    backgroundColor: 'var(--color-white)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                }}
            >
                {/* 定义渐变和滤镜 */}
                <defs>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {/* 画布主容器 - 应用缩放和平移 */}
                <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
                    {/* 绘制连线 */}
                    {connections.map((conn, index) => {
                        const fromNode = nodes.find((n) => n.id === conn.from);
                        const toNode = nodes.find((n) => n.id === conn.to);

                        if (!fromNode || !toNode) return null;

                        return (
                            <line
                                key={`${conn.from}-${conn.to}-${index}`}
                                x1={fromNode.x}
                                y1={fromNode.y}
                                x2={toNode.x}
                                y2={toNode.y}
                                stroke="var(--color-black)"
                                strokeWidth="2"
                                opacity="0.3"
                                style={{
                                    animation: 'fadeIn 0.3s ease-out',
                                }}
                            />
                        );
                    })}

                    {/* 绘制节点 */}
                    {nodes.map((node) => {
                        const size = getNodeSize(node);
                        const radius = size / 2;
                        const lines = wrapText(node.text, node.level === 0 || node.isSelected ? 6 : 4);
                        const lineHeight = 20;
                        const totalHeight = lines.length * lineHeight;
                        const startY = node.y - totalHeight / 2 + lineHeight / 2;

                        return (
                            <g
                                key={node.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNodeClick(node.id);
                                }}
                                onContextMenu={(e) => handleNodeRightClick(e, node.id)}
                                style={{
                                    cursor: 'pointer',
                                    animation: 'fadeIn 0.5s ease-out',
                                }}
                            >
                                {/* 节点圆圈 */}
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={radius}
                                    fill={node.fillColor || (node.isSelected ? 'var(--color-yellow)' : 'var(--color-white)')}
                                    stroke="var(--color-black)"
                                    strokeWidth="3"
                                    filter={node.isSelected ? 'url(#glow)' : 'none'}
                                    style={{
                                        transition: 'all 0.3s ease',
                                    }}
                                />

                                {/* 节点文字 */}
                                <text
                                    x={node.x}
                                    y={startY}
                                    textAnchor="middle"
                                    style={{
                                        fontSize: node.level === 0 || node.isSelected ? '16px' : '14px',
                                        fontWeight: 'bold',
                                        fill: 'var(--color-black)',
                                        pointerEvents: 'none',
                                        userSelect: 'none',
                                    }}
                                >
                                    {lines.map((line, i) => (
                                        <tspan
                                            key={i}
                                            x={node.x}
                                            dy={i === 0 ? 0 : lineHeight}
                                        >
                                            {line}
                                        </tspan>
                                    ))}
                                </text>
                            </g>
                        );
                    })}

                    {/* 加载动画 */}
                    {loadingNodeId && (
                        (() => {
                            const node = nodes.find((n) => n.id === loadingNodeId);
                            if (!node) return null;
                            return <LoadingEffect x={node.x} y={node.y} />;
                        })()
                    )}
                </g>
            </svg>

            {/* 缩放控制工具栏 */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '100px',
                    right: '25px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    zIndex: 10,
                }}
            >
                <div
                    className="glass"
                    style={{
                        padding: '10px',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    }}
                >
                    <button
                        onClick={() => setTransform(prev => ({ ...prev, scale: Math.min(prev.scale + 0.2, 3) }))}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                        title="放大"
                    >
                        +
                    </button>
                    <button
                        onClick={() => setTransform(prev => ({ ...prev, scale: Math.max(prev.scale - 0.2, 0.2) }))}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }}
                        title="缩小"
                    >
                        -
                    </button>
                    <button
                        onClick={resetView}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                        }}
                        title="重置"
                    >
                        1:1
                    </button>
                </div>
                <div
                    className="glass"
                    style={{
                        padding: '5px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--color-gray)',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        textAlign: 'center',
                    }}
                >
                    {Math.round(transform.scale * 100)}%
                </div>
            </div>
        </div>
    );
};

export default Canvas;

