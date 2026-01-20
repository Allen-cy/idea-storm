import { useState, useEffect } from 'react';
import Canvas from './components/Canvas';
import InputBox from './components/InputBox';
import HistoryPanel from './components/HistoryPanel';
import Toast from './components/Toast';
import { Node, Connection, HistoryEntry, Frame } from './types';
import { generateRelatedWords, clusterNodes, extractNodesFromText, suggestFrameTitle } from './utils/gemini';
import { calculateRadialLayout, calculateClusteredLayout } from './utils/layout';
import './index.css';

function App() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [frames, setFrames] = useState<Frame[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [wordCount, setWordCount] = useState(8);

    // 从 localStorage 加载历史记录
    useEffect(() => {
        const savedHistory = localStorage.getItem('app_history');
        if (savedHistory) {
            try {
                setHistory(JSON.parse(savedHistory));
            } catch (e) {
                console.error('加载历史记录失败', e);
            }
        }
    }, []);

    // 保存历史记录到 localStorage
    const saveToHistory = (rootText: string) => {
        const entry: HistoryEntry = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            rootText,
            nodes: [...nodes],
            connections: [...connections],
        };
        const newHistory = [...history, entry];
        setHistory(newHistory);
        localStorage.setItem('app_history', JSON.stringify(newHistory));
    };

    // 清空历史记录
    const handleClearHistory = () => {
        if (history.length === 0) return;

        if (window.confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
            setHistory([]);
            localStorage.removeItem('app_history');
            setToast({ message: '历史记录已清空', type: 'info' });
        }
    };

    // 获取选中的节点
    const getSelectedNode = (): Node | null => {
        return nodes.find((n) => n.isSelected) || null;
    };

    // 处理输入提交
    const handleInputSubmit = (text: string) => {
        const selectedNode = getSelectedNode();

        if (selectedNode) {
            // 有选中节点，新词与选中词相连
            addChildNode(selectedNode, text);
        } else {
            // 无选中节点，作为新的独立中心词
            addCenterNode(text);
        }
    };

    // 添加中心节点
    const addCenterNode = (text: string) => {
        const newNode: Node = {
            id: Date.now().toString(),
            text,
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            isSelected: false,
            level: 0,
        };

        setNodes([...nodes, newNode]);

        // 保存到历史
        setTimeout(() => saveToHistory(text), 100);
    };

    // 添加子节点
    const addChildNode = (parentNode: Node, text: string) => {
        const newNode: Node = {
            id: Date.now().toString(),
            text,
            x: parentNode.x + 200,
            y: parentNode.y,
            isSelected: false,
            level: parentNode.level + 1,
            parentId: parentNode.id,
        };

        setNodes([...nodes, newNode]);
        setConnections([...connections, { from: parentNode.id, to: newNode.id }]);
    };

    // 处理节点点击（左键）- 发散
    const handleNodeClick = async (nodeId: string) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node || loadingNodeId) return;

        try {
            setLoadingNodeId(nodeId);

            // 获取当前画布上已有的所有词汇，用于去重避让
            const currentWords = nodes.map(n => n.text);

            // 调用 SiliconFlow API 生成关联词，传入自定义词数和排除列表
            const relatedWords = await generateRelatedWords(node.text, wordCount, currentWords);

            // 计算辐射状布局，传入现有节点进行避让
            const positions = calculateRadialLayout(node, relatedWords.length, nodes);

            // 创建新节点
            const newNodes: Node[] = relatedWords.map((word, index) => ({
                id: `${Date.now()}-${index}`,
                text: word,
                x: positions[index].x,
                y: positions[index].y,
                isSelected: false,
                level: node.level + 1,
                parentId: node.id,
            }));

            // 创建连线
            const newConnections: Connection[] = newNodes.map((newNode) => ({
                from: node.id,
                to: newNode.id,
            }));

            setNodes([...nodes, ...newNodes]);
            setConnections([...connections, ...newConnections]);
            setLoadingNodeId(null);
        } catch (error) {
            setLoadingNodeId(null);
            setToast({
                message: `生成失败: ${error instanceof Error ? error.message : '未知错误'}`,
                type: 'error',
            });
        }
    };

    // 处理节点右键点击 - 选中/取消选中
    const handleNodeRightClick = (nodeId: string) => {
        setNodes(
            nodes.map((n) => {
                if (n.id === nodeId) {
                    return { ...n, isSelected: !n.isSelected };
                }
                // 取消其他节点的选中状态
                return { ...n, isSelected: false };
            })
        );
    };

    // 处理批量选择
    const handleSelectionChange = (selectedIds: string[], isAdditive: boolean) => {
        setNodes(
            nodes.map((n) => ({
                ...n,
                isSelected: isAdditive
                    ? (selectedIds.includes(n.id) ? true : n.isSelected)
                    : selectedIds.includes(n.id)
            }))
        );
    };

    // 恢复历史记录
    const handleRestoreHistory = (entry: HistoryEntry) => {
        setNodes(entry.nodes);
        setConnections(entry.connections);
    };

    // 更新节点颜色
    const handleUpdateNodeColor = (color: string) => {
        const selectedNode = getSelectedNode();
        if (!selectedNode) return;

        setNodes(nodes.map(n => n.id === selectedNode.id ? { ...n, fillColor: color } : n));

        // 自动保存一次历史
        setTimeout(() => saveToHistory('更新颜色'), 500);
    };

    // 切换节点类型
    const handleToggleNodeType = () => {
        const selectedNode = getSelectedNode();
        if (!selectedNode) return;

        const newType = selectedNode.type === 'note' ? 'default' : 'note';
        setNodes(nodes.map(n => n.id === selectedNode.id ? {
            ...n,
            type: newType,
            width: newType === 'note' ? 200 : undefined,
            height: newType === 'note' ? 120 : undefined,
            content: newType === 'note' ? n.text : undefined,
        } : n));

        setToast({ message: `节点已转换为 ${newType === 'note' ? '笔记' : '词汇'}`, type: 'info' });
        setTimeout(() => saveToHistory('切换节点类型'), 500);
    };

    // 更新笔记内容
    const handleUpdateNodeContent = (nodeId: string, content: string) => {
        setNodes(nodes.map(n => n.id === nodeId ? { ...n, content } : n));
    };

    // 清空页面
    const handleClearCanvas = () => {
        if (nodes.length === 0) return;

        // 如果想增加确认可以加 confirm
        // if (!window.confirm('确定要清空当前页面吗？')) return;

        setNodes([]);
        setConnections([]);
        setToast({ message: '画布已清空', type: 'info' });
    };

    // 创建边框/组
    const handleCreateFrame = () => {
        const selectedNodes = nodes.filter(n => n.isSelected);
        if (selectedNodes.length === 0) {
            setToast({ message: '请先选择要成组的节点', type: 'info' });
            return;
        }

        const minX = Math.min(...selectedNodes.map(n => n.x)) - 40;
        const minY = Math.min(...selectedNodes.map(n => n.y)) - 40;
        const maxX = Math.max(...selectedNodes.map(n => n.x)) + 40;
        const maxY = Math.max(...selectedNodes.map(n => n.y)) + 40;

        const newFrame: Frame = {
            id: `frame-${Date.now()}`,
            title: '正在总结...',
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            nodeIds: selectedNodes.map(n => n.id),
        };

        setFrames([...frames, newFrame]);

        // 异步获取 AI 建议的标题
        suggestFrameTitle(selectedNodes.map(n => n.text)).then((suggestedTitle: string) => {
            setFrames(prev => prev.map(f => f.id === newFrame.id ? { ...f, title: suggestedTitle } : f));
        });

        setToast({ message: '已创建分组', type: 'success' });
        setTimeout(() => saveToHistory('创建分组'), 500);
    };

    // 处理分组重命名
    const handleFrameRename = (frameId: string, name: string) => {
        setFrames(frames.map(f => f.id === frameId ? { ...f, title: name } : f));
        setTimeout(() => saveToHistory('重命名分组'), 500);
    };

    // 从笔记中提取创意点
    const handleExtractFromNote = async (nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node || !node.content || loadingNodeId) return;

        try {
            setLoadingNodeId(nodeId);
            setToast({ message: '正在提取核心观点...', type: 'info' });

            const extractedWords = await extractNodesFromText(node.content);

            // 计算布局 (复用辐射布局)
            const positions = calculateRadialLayout(node, extractedWords.length, nodes);

            const newNodes: Node[] = extractedWords.map((word: string, index: number) => ({
                id: `extract-${Date.now()}-${index}`,
                text: word,
                x: positions[index].x,
                y: positions[index].y,
                isSelected: false,
                level: node.level + 1,
                parentId: node.id,
            }));

            const newConnections: Connection[] = newNodes.map((nn) => ({
                from: node.id,
                to: nn.id,
            }));

            setNodes([...nodes, ...newNodes]);
            setConnections([...connections, ...newConnections]);
            setToast({ message: `成功提取 ${extractedWords.length} 个观点`, type: 'success' });
            setLoadingNodeId(null);
            setTimeout(() => saveToHistory('从笔记提取'), 500);
        } catch (error) {
            setLoadingNodeId(null);
            setToast({ message: '提取失败', type: 'error' });
        }
    };

    // 统一处理聚类
    const handleAffinityGrouping = async () => {
        if (nodes.length <= 1 || loadingNodeId) return;

        try {
            setLoadingNodeId('clustering'); // 使用特殊ID表示聚类中
            setToast({ message: '正在进行智能聚类...', type: 'info' });

            // 1. 获取聚类结果
            const clusters = await clusterNodes(nodes);

            // 2. 计算新布局
            const updatedNodes = calculateClusteredLayout(nodes, clusters);

            setNodes(updatedNodes);
            setToast({ message: '聚类完成', type: 'success' });
            setLoadingNodeId(null);

            // 保存历史
            setTimeout(() => saveToHistory('智能聚类'), 500);
        } catch (error) {
            setLoadingNodeId(null);
            setToast({
                message: `聚类失败: ${error instanceof Error ? error.message : '未知错误'}`,
                type: 'error',
            });
        }
    };

    const COLORS = [
        '#FFFFFF', // 白色
        '#FFEB3B', // 黄色
        '#FFCDD2', // 淡红
        '#C8E6C9', // 淡绿
        '#BBDEFB', // 淡蓝
        '#E1BEE7', // 淡紫
        '#FFE0B2', // 淡橙
    ];

    // 处理手动连线
    const handleManualConnect = (fromId: string, toId: string) => {
        // 检查是否已经存在连接
        const exists = connections.some(c => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId));
        if (exists) return;

        const newConnection: Connection = {
            id: `manual-${Date.now()}`,
            from: fromId,
            to: toId,
            isManual: true,
            label: '关联', // 默认标签
        };

        setConnections([...connections, newConnection]);
        setToast({ message: '创建了手动连接', type: 'success' });

        // 保存历史
        setTimeout(() => saveToHistory('创建手动连线'), 500);
    };

    // 处理连线右键点击 (编辑标签)
    const handleConnectionRightClick = (connId: string) => {
        const conn = connections.find(c => c.id === connId || `${c.from}-${c.to}` === connId);
        if (!conn) return;

        const newLabel = prompt('请输入连线关系描述 (如: 包含, 因果, 竞争):', conn.label || '');
        if (newLabel === null) return; // 取消

        setConnections(connections.map(c => {
            if (c.id === connId || `${c.from}-${c.to}` === connId) {
                return { ...c, label: newLabel };
            }
            return c;
        }));

        setToast({ message: '连线标签已更新', type: 'success' });
        setTimeout(() => saveToHistory('更新连线标签'), 500);
    };

    // 导出为 JSON
    const handleExportJSON = () => {
        const data = {
            nodes: nodes.map(({ id, text, x, y, type, content, level, parentId, fillColor }) => ({ id, text, x, y, type, content, level, parentId, fillColor })),
            connections,
            frames,
            version: '2.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brainstorm-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        setToast({ message: 'JSON 导出成功', type: 'success' });
    };

    // 导出为 Markdown 大纲
    const handleExportMarkdown = () => {
        const buildTree = (parentId?: string, level: number = 0): string => {
            const children = nodes.filter(n => n.parentId === parentId);
            return children.map(child => {
                const indent = '  '.repeat(level);
                let content = `${indent}- ${child.text}`;
                if (child.content) {
                    content += `\n${indent}  > ${child.content.replace(/\n/g, `\n${indent}  > `)}`;
                }
                const subTree = buildTree(child.id, level + 1);
                return content + (subTree ? `\n${subTree}` : '');
            }).join('\n');
        };

        const markdown = buildTree();
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brainstorm-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        setToast({ message: 'Markdown 导出成功', type: 'success' });
    };

    // 导出图片
    const handleExportPNG = () => {
        setToast({ message: '图片导出功能建议使用系统截图，以保持最佳质量', type: 'info' });
    };

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <Canvas
                nodes={nodes}
                connections={connections}
                onNodeClick={handleNodeClick}
                onNodeRightClick={handleNodeRightClick}
                onConnectionRightClick={handleConnectionRightClick}
                onManualConnect={handleManualConnect}
                onNodeContentUpdate={handleUpdateNodeContent}
                onNodeExtract={handleExtractFromNote}
                frames={frames}
                onFrameRename={handleFrameRename}
                onSelectionChange={handleSelectionChange}
                searchQuery={searchQuery}
                loadingNodeId={loadingNodeId}
            />
            <InputBox onSubmit={handleInputSubmit} />
            <HistoryPanel history={history} onRestore={handleRestoreHistory} onClear={handleClearHistory} />

            {/* 顶层工具栏 */}
            <div
                style={{
                    position: 'absolute',
                    top: '25px',
                    left: '25px',
                    display: 'flex',
                    gap: '15px',
                    zIndex: 10,
                }}
            >
                {/* 聚类按钮 */}
                <button
                    className="glass"
                    onClick={handleAffinityGrouping}
                    disabled={!!loadingNodeId || nodes.length <= 1}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '30px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        opacity: loadingNodeId ? 0.6 : 1,
                    }}
                >
                    {loadingNodeId === 'clustering' ? '聚类中...' : '🧠 智能聚拢'}
                </button>

                {/* 搜索框 */}
                <div
                    className="glass"
                    style={{
                        padding: '5px 15px',
                        borderRadius: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    }}
                >
                    <span style={{ fontSize: '16px' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="搜索节点..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            border: 'none',
                            background: 'none',
                            outline: 'none',
                            fontSize: '14px',
                            width: '120px',
                        }}
                    />
                </div>

                {/* 导出按钮组 */}
                <div
                    className="glass"
                    style={{
                        padding: '5px 15px',
                        borderRadius: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                    }}
                >
                    <button
                        onClick={handleExportJSON}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                        title="导出 JSON"
                    >
                        💾
                    </button>
                    <button
                        onClick={handleExportMarkdown}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                        title="导出 Markdown"
                    >
                        📝
                    </button>
                    <button
                        onClick={handleExportPNG}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                        title="导出图片"
                    >
                        🖼️
                    </button>
                </div>

                {/* 清空页面按钮 */}
                <button
                    className="glass"
                    onClick={handleClearCanvas}
                    disabled={!!loadingNodeId || nodes.length === 0}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '30px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        color: nodes.length > 0 ? '#ff4d4f' : '#ccc',
                        opacity: loadingNodeId ? 0.6 : 1,
                    }}
                >
                    🗑️ 清空页面
                </button>

                {/* 颜色选择器 */}
                {getSelectedNode() && (
                    <div
                        className="glass"
                        style={{
                            padding: '10px 15px',
                            borderRadius: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '15px',
                        }}
                    >
                        <button
                            onClick={handleToggleNodeType}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                            }}
                            title={getSelectedNode()?.type === 'note' ? "转为普通节点" : "转为笔记节点"}
                        >
                            {getSelectedNode()?.type === 'note' ? '📝' : '📄'}
                        </button>
                        <button
                            onClick={handleCreateFrame}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '18px',
                            }}
                            title="将选定节点成组"
                        >
                            📦
                        </button>
                        <div style={{ height: '20px', width: '1px', backgroundColor: 'rgba(0,0,0,0.1)' }} />
                        <span style={{ fontSize: '12px', opacity: 0.6 }}>节点填充</span>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            {COLORS.map(color => (
                                <div
                                    key={color}
                                    onClick={() => handleUpdateNodeColor(color)}
                                    style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        backgroundColor: color,
                                        border: '1px solid rgba(0,0,0,0.1)',
                                        cursor: 'pointer',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 词数控制 UI */}
            <div
                className="glass"
                style={{
                    position: 'absolute',
                    bottom: '25px',
                    left: '25px',
                    padding: '10px 15px',
                    borderRadius: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    zIndex: 10,
                }}
            >
                <div style={{ fontSize: '12px', opacity: 0.6 }}>联想词数</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => setWordCount(Math.max(1, wordCount - 1))}
                        style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: '1px solid var(--color-black)',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                        }}
                    >
                        -
                    </button>
                    <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>{wordCount}</span>
                    <button
                        onClick={() => setWordCount(Math.min(15, wordCount + 1))}
                        style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: '1px solid var(--color-black)',
                            background: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                        }}
                    >
                        +
                    </button>
                </div>
            </div>

            {/* 版本信息 */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    fontSize: '10px',
                    color: 'var(--color-gray)',
                    opacity: 0.5,
                    pointerEvents: 'none',
                    userSelect: 'none',
                    zIndex: 5,
                    textAlign: 'right',
                }}
            >
                v2.0.0 | Updated: 2026-01-16 13:33
            </div>

            {/* 通知组件 */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}

export default App;
