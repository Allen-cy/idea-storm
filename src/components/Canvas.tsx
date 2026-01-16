import React, { useState, useRef, useEffect } from 'react';
import { Node, Connection, Frame } from '../types';
import LoadingEffect from './LoadingEffect';

interface CanvasProps {
    nodes: Node[];
    connections: Connection[];
    onNodeClick: (nodeId: string) => void;
    onNodeRightClick: (nodeId: string) => void;
    onConnectionRightClick?: (connId: string) => void;
    onManualConnect?: (fromId: string, toId: string) => void;
    onNodeContentUpdate?: (nodeId: string, content: string) => void;
    onNodeExtract?: (nodeId: string) => void;
    frames: Frame[];
    onFrameRename?: (frameId: string, name: string) => void;
    onSelectionChange?: (nodeIds: string[], isAdditive: boolean) => void;
    searchQuery?: string;
    loadingNodeId: string | null;
}

interface Transform {
    x: number;
    y: number;
    scale: number;
}

interface SelectionRect {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    active: boolean;
}

const Canvas: React.FC<CanvasProps> = ({
    nodes,
    connections,
    onNodeClick,
    onNodeRightClick,
    onConnectionRightClick,
    onManualConnect,
    onNodeContentUpdate,
    onNodeExtract,
    frames,
    onFrameRename,
    onSelectionChange,
    searchQuery = '',
    loadingNodeId,
}) => {
    const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [selectionRect, setSelectionRect] = useState<SelectionRect>({ x1: 0, y1: 0, x2: 0, y2: 0, active: false });
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
        // 只有点击背景（SVG本身）才触发
        if (e.target === svgRef.current) {
            if (e.shiftKey) {
                const rect = svgRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left - transform.x) / transform.scale;
                const y = (e.clientY - rect.top - transform.y) / transform.scale;
                setSelectionRect({ x1: x, y1: y, x2: x, y2: y, active: true });
            } else {
                setIsDragging(true);
                setLastMousePos({ x: e.clientX, y: e.clientY });
            }
        }
    };

    // 全局鼠标移动处理 (处理平移和连线拖拽/框选)
    const handleMouseMoveGlobal = (e: MouseEvent) => {
        if (isDragging) {
            const dx = e.clientX - lastMousePos.x;
            const dy = e.clientY - lastMousePos.y;
            setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            setLastMousePos({ x: e.clientX, y: e.clientY });
        } else if (connectingFrom) {
            if (svgRef.current) {
                const rect = svgRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left - transform.x) / transform.scale;
                const y = (e.clientY - rect.top - transform.y) / transform.scale;
                setDragPosition({ x, y });
            }
        } else if (selectionRect.active) {
            if (svgRef.current) {
                const rect = svgRef.current.getBoundingClientRect();
                const x = (e.clientX - rect.left - transform.x) / transform.scale;
                const y = (e.clientY - rect.top - transform.y) / transform.scale;
                setSelectionRect(prev => ({ ...prev, x2: x, y2: y }));
            }
        }
    };

    const handleMouseUpGlobal = (e: MouseEvent) => {
        if (selectionRect.active) {
            // 计算框选范围内节点
            const x1 = Math.min(selectionRect.x1, selectionRect.x2);
            const x2 = Math.max(selectionRect.x1, selectionRect.x2);
            const y1 = Math.min(selectionRect.y1, selectionRect.y2);
            const y2 = Math.max(selectionRect.y1, selectionRect.y2);

            const selectedIds = nodes.filter(n => {
                // 简化判定：中心在矩形内
                return n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2;
            }).map(n => n.id);

            onSelectionChange?.(selectedIds, e.shiftKey);
            setSelectionRect(prev => ({ ...prev, active: false }));
        }

        setIsDragging(false);
        setConnectingFrom(null);
    };

    // 处理拖拽移动和连线的副作用
    useEffect(() => {
        if (isDragging || connectingFrom || selectionRect.active) {
            window.addEventListener('mousemove', handleMouseMoveGlobal);
            window.addEventListener('mouseup', handleMouseUpGlobal);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMoveGlobal);
            window.removeEventListener('mouseup', handleMouseUpGlobal);
        };
    }, [isDragging, connectingFrom, selectionRect.active, lastMousePos, transform]);

    // 处理连线开始
    const handleStartConnect = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        setConnectingFrom(nodeId);
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setDragPosition({ x: node.x, y: node.y });
        }
    };

    // 处理连线结束 (释放在节点上)
    const handleEndConnect = (_e: React.MouseEvent, targetNodeId: string) => {
        if (connectingFrom && connectingFrom !== targetNodeId) {
            onManualConnect?.(connectingFrom, targetNodeId);
        }
        setConnectingFrom(null);
    };

    // 处理连线右键点击
    const handleConnectionRightClick = (e: React.MouseEvent, connId: string) => {
        e.preventDefault();
        e.stopPropagation();
        onConnectionRightClick?.(connId);
    };

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
                    {/* 绘制边框 (Frame) */}
                    {frames.map((frame) => (
                        <g key={frame.id}>
                            <rect
                                x={frame.x}
                                y={frame.y}
                                width={frame.width}
                                height={frame.height}
                                fill={frame.fillColor || 'rgba(0, 0, 0, 0.03)'}
                                stroke="var(--color-gray)"
                                strokeWidth="1"
                                strokeDasharray="5,5"
                                rx="10"
                            />
                            <text
                                x={frame.x + 10}
                                y={frame.y + 25}
                                style={{
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    fill: 'var(--color-gray)',
                                    cursor: 'pointer',
                                }}
                                onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    const newName = prompt('输入分组名称:', frame.title);
                                    if (newName) onFrameRename?.(frame.id, newName);
                                }}
                            >
                                {frame.title}
                            </text>
                        </g>
                    ))}

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
                                strokeWidth={conn.isManual ? 2 : 2}
                                strokeDasharray={conn.isManual ? "5,5" : "none"}
                                opacity={conn.isManual ? 0.6 : 0.3}
                                style={{
                                    animation: 'fadeIn 0.3s ease-out',
                                }}
                            />
                        );
                    })}

                    {/* 绘制连线热区和文字标签 (放在连线之上) */}
                    {connections.map((conn, index) => {
                        const fromNode = nodes.find((n) => n.id === conn.from);
                        const toNode = nodes.find((n) => n.id === conn.to);

                        if (!fromNode || !toNode) return null;

                        const midX = (fromNode.x + toNode.x) / 2;
                        const midY = (fromNode.y + toNode.y) / 2;

                        return (
                            <g key={`hit-${conn.from}-${conn.to}-${index}`}>
                                {/* 增加点击热区的透明宽线 */}
                                <line
                                    x1={fromNode.x}
                                    y1={fromNode.y}
                                    x2={toNode.x}
                                    y2={toNode.y}
                                    stroke="transparent"
                                    strokeWidth="10"
                                    style={{ cursor: 'pointer' }}
                                    onContextMenu={(e) => handleConnectionRightClick(e, conn.id || `${conn.from}-${conn.to}`)}
                                />
                                {conn.label && (
                                    <g transform={`translate(${midX}, ${midY})`}>
                                        <rect
                                            x="-30"
                                            y="-10"
                                            width="60"
                                            height="20"
                                            rx="10"
                                            fill="rgba(255, 255, 255, 0.8)"
                                            stroke="var(--color-black)"
                                            strokeWidth="1"
                                            style={{ pointerEvents: 'none' }}
                                        />
                                        <text
                                            textAnchor="middle"
                                            dy="5"
                                            style={{
                                                fontSize: '10px',
                                                fill: 'var(--color-black)',
                                                pointerEvents: 'none',
                                                userSelect: 'none',
                                            }}
                                        >
                                            {conn.label}
                                        </text>
                                    </g>
                                )}
                            </g>
                        );
                    })}

                    {/* 绘制正在拖拽的连线 */}
                    {connectingFrom && (
                        (() => {
                            const fromNode = nodes.find(n => n.id === connectingFrom);
                            if (!fromNode) return null;
                            return (
                                <line
                                    x1={fromNode.x}
                                    y1={fromNode.y}
                                    x2={dragPosition.x}
                                    y2={dragPosition.y}
                                    stroke="var(--color-blue)"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                />
                            );
                        })()
                    )}

                    {/* 绘制节点 */}
                    {nodes.map((node) => {
                        const size = getNodeSize(node);
                        const radius = size / 2;
                        const isNote = node.type === 'note';
                        const width = node.width || 120;
                        const height = node.height || 80;

                        const lines = wrapText(node.text, isNote ? 12 : (node.level === 0 || node.isSelected ? 6 : 4));
                        const lineHeight = 20;
                        const totalHeight = lines.length * lineHeight;
                        const startY = node.y - totalHeight / 2 + lineHeight / 2;

                        return (
                            <g
                                key={node.id}
                                onClick={(e) => {
                                    if (connectingFrom) return;
                                    e.stopPropagation();
                                    onNodeClick(node.id);
                                }}
                                onDoubleClick={(e) => {
                                    if (isNote) {
                                        e.stopPropagation();
                                        setEditingNodeId(node.id);
                                    }
                                }}
                                onContextMenu={(e) => handleNodeRightClick(e, node.id)}
                                onMouseEnter={() => setHoveredNodeId(node.id)}
                                onMouseLeave={() => setHoveredNodeId(null)}
                                onMouseUp={(e) => handleEndConnect(e, node.id)}
                                opacity={!searchQuery || node.text.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0.2}
                                style={{
                                    cursor: connectingFrom ? 'crosshair' : 'pointer',
                                    animation: 'fadeIn 0.5s ease-out',
                                    transition: 'opacity 0.3s ease',
                                }}
                            >
                                {/* 节点背景 */}
                                {isNote ? (
                                    <rect
                                        x={node.x - width / 2}
                                        y={node.y - height / 2}
                                        width={width}
                                        height={height}
                                        rx={8}
                                        fill={node.fillColor || (node.isSelected ? 'var(--color-yellow)' : 'var(--color-white)')}
                                        stroke="var(--color-black)"
                                        strokeWidth="2"
                                        filter={node.isSelected ? 'url(#glow)' : 'none'}
                                        style={{ transition: 'all 0.3s ease' }}
                                    />
                                ) : (
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
                                            stroke: hoveredNodeId === node.id || connectingFrom === node.id ? 'var(--color-blue)' : 'var(--color-black)',
                                        }}
                                    />
                                )}

                                {/* 锚点 (只在悬停时显示) */}
                                {(hoveredNodeId === node.id || connectingFrom === node.id) && (
                                    <circle
                                        cx={isNote ? node.x + width / 2 : node.x + radius}
                                        cy={node.y}
                                        r={6}
                                        fill="var(--color-blue)"
                                        style={{ cursor: 'crosshair' }}
                                        onMouseDown={(e) => handleStartConnect(e, node.id)}
                                    />
                                )}

                                {/* 节点文字 */}
                                <text
                                    x={node.x}
                                    y={isNote ? node.y - height / 2 + 25 : startY}
                                    textAnchor="middle"
                                    style={{
                                        fontSize: isNote ? '14px' : (node.level === 0 || node.isSelected ? '16px' : '14px'),
                                        fontWeight: 'bold',
                                        fill: 'var(--color-black)',
                                        pointerEvents: 'none',
                                        userSelect: 'none',
                                    }}
                                >
                                    {isNote ? node.text : lines.map((line, i) => (
                                        <tspan
                                            key={i}
                                            x={node.x}
                                            dy={i === 0 ? 0 : lineHeight}
                                        >
                                            {line}
                                        </tspan>
                                    ))}
                                </text>

                                {/* 笔记内容摘要 (如果是Note类型) */}
                                {isNote && node.content && (
                                    <text
                                        x={node.x - width / 2 + 10}
                                        y={node.y - height / 2 + 50}
                                        style={{
                                            fontSize: '12px',
                                            fill: 'var(--color-gray)',
                                            pointerEvents: 'none',
                                            userSelect: 'none',
                                        }}
                                    >
                                        <tspan x={node.x - width / 2 + 10} dy="0">
                                            {node.content.slice(0, 20)}{node.content.length > 20 ? '...' : ''}
                                        </tspan>
                                    </text>
                                )}
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

                    {/* 框选矩形 */}
                    {selectionRect.active && (
                        <rect
                            x={Math.min(selectionRect.x1, selectionRect.x2)}
                            y={Math.min(selectionRect.y1, selectionRect.y2)}
                            width={Math.abs(selectionRect.x2 - selectionRect.x1)}
                            height={Math.abs(selectionRect.y2 - selectionRect.y1)}
                            fill="rgba(33, 150, 243, 0.1)"
                            stroke="var(--color-blue)"
                            strokeWidth={1 / transform.scale}
                            strokeDasharray={`${4 / transform.scale},${4 / transform.scale}`}
                        />
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

            {/* 笔记编辑器弹窗 */}
            {editingNodeId && (
                (() => {
                    const node = nodes.find(n => n.id === editingNodeId);
                    if (!node) return null;
                    return (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100vw',
                                height: '100vh',
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 100,
                            }}
                            onClick={() => setEditingNodeId(null)}
                        >
                            <div
                                className="glass"
                                style={{
                                    width: '80%',
                                    maxWidth: '600px',
                                    padding: '25px',
                                    borderRadius: '20px',
                                    backgroundColor: 'white',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '15px',
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                <h3>编辑笔记: {node.text}</h3>
                                <textarea
                                    autoFocus
                                    value={node.content || ''}
                                    onChange={(e) => onNodeContentUpdate?.(node.id, e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: '300px',
                                        padding: '15px',
                                        borderRadius: '10px',
                                        border: '1px solid #ddd',
                                        fontSize: '16px',
                                        fontFamily: 'inherit',
                                        resize: 'none',
                                    }}
                                    placeholder="输入 Markdown 内容..."
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                    <button
                                        onClick={() => onNodeExtract?.(node.id)}
                                        disabled={!node.content || loadingNodeId !== null}
                                        style={{
                                            padding: '10px 25px',
                                            borderRadius: '25px',
                                            border: '1px solid var(--color-black)',
                                            backgroundColor: 'white',
                                            color: 'var(--color-black)',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                            opacity: (!node.content || loadingNodeId !== null) ? 0.5 : 1,
                                        }}
                                    >
                                        AI 提取观点
                                    </button>
                                    <button
                                        onClick={() => setEditingNodeId(null)}
                                        style={{
                                            padding: '10px 25px',
                                            borderRadius: '25px',
                                            border: 'none',
                                            backgroundColor: 'var(--color-black)',
                                            color: 'white',
                                            cursor: 'pointer',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        完成
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            )}

            {/* 小地图 (Mini-map) */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '25px',
                    right: '80px',
                    width: '150px',
                    height: '100px',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    zIndex: 10,
                    pointerEvents: 'none',
                }}
                className="glass"
            >
                <svg
                    width="100%"
                    height="100%"
                    viewBox="-500 -500 1000 1000" // 假设主要范围
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* 绘制小地图节点 */}
                    {nodes.map(n => (
                        <circle
                            key={`mini-${n.id}`}
                            cx={n.x}
                            cy={n.y}
                            r={15}
                            fill={n.fillColor || 'var(--color-black)'}
                            opacity="0.5"
                        />
                    ))}
                    {/* 绘制当前视口范围 */}
                    {svgRef.current && (
                        (() => {
                            const rect = svgRef.current.getBoundingClientRect();
                            const vX = -transform.x / transform.scale;
                            const vY = -transform.y / transform.scale;
                            const vW = rect.width / transform.scale;
                            const vH = rect.height / transform.scale;
                            return (
                                <rect
                                    x={vX}
                                    y={vY}
                                    width={vW}
                                    height={vH}
                                    fill="none"
                                    stroke="var(--color-blue)"
                                    strokeWidth="10"
                                />
                            );
                        })()
                    )}
                </svg>
            </div>
        </div>
    );
};

export default Canvas;
