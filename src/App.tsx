import { useState, useEffect } from 'react';
import Canvas from './components/Canvas';
import InputBox from './components/InputBox';
import HistoryPanel from './components/HistoryPanel';
import Toast from './components/Toast';
import { Node, Connection, HistoryEntry } from './types';
import { generateRelatedWords, clusterNodes } from './utils/gemini';
import { calculateRadialLayout, calculateClusteredLayout } from './utils/layout';
import './index.css';

function App() {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loadingNodeId, setLoadingNodeId] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

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

        setHasStarted(true);
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

            // 调用 SiliconFlow API 生成关联词，传入自定义词数
            const relatedWords = await generateRelatedWords(node.text, wordCount);

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
        setTimeout(() => saveToHistory(nodes.find(n => n.level === 0)?.text || '更新颜色'), 500);
    };

    // 亲和图聚类整合
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

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <Canvas
                nodes={nodes}
                connections={connections}
                onNodeClick={handleNodeClick}
                onNodeRightClick={handleNodeRightClick}
                loadingNodeId={loadingNodeId}
            />
            <InputBox onSubmit={handleInputSubmit} isAtBottom={hasStarted} />
            <HistoryPanel history={history} onRestore={handleRestoreHistory} />

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

                {/* 颜色选择器 */}
                {getSelectedNode() && (
                    <div
                        className="glass"
                        style={{
                            padding: '10px 15px',
                            borderRadius: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                        }}
                    >
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
