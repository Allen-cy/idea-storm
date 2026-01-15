import { Node } from '../types';


const SILICONFLOW_API_KEY = 'sk-fqazedyliwxdejklryyhdsdcgzbkzjepkzfeyvalkeglwemp';
const API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const MODEL_NAME = 'deepseek-ai/DeepSeek-V3';

/**
 * 调用 SiliconFlow API 生成关联词
 * @param word 核心词语
 * @param count 需要生成的关联词数量 (默认 8)
 * @returns 关联词数组
 */
export const generateRelatedWords = async (word: string, count: number = 8): Promise<string[]> => {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SILICONFLOW_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    {
                        role: 'system',
                        content: `你是一个创意发散助手。请根据用户提供的核心词，生成 ${count} 个高度相关的、具有启发性的关联词或短语。
要求：
1. 词语要简洁，通常在 2-4 个字之间。
2. 关联方向要多样化，包含具体事物、抽象概念、行动建议等。
3. 请直接返回词语列表，用半角逗号(,)分隔，不要有任何多余的解释文字。
示例输入：咖啡
示例输出：拿铁,烘焙,唤醒,下午茶,第三空间,提神,豆子,浓缩`
                    },
                    {
                        role: 'user',
                        content: word
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content.trim();

        // 解析逗号分隔的词语，并清理空字符和可能的换行
        const words = content.split(/[,，\n]/)
            .map((w: string) => w.trim())
            .filter((w: string) => w.length > 0)
            .slice(0, count);

        // 如果 AI 返回的数量不足，用本地备选方案补充（可选，此处暂不实现，假设 AI 足够可靠）
        return words;
    } catch (error) {
        console.error('SiliconFlow API Error:', error);
        throw error;
    }
};

// 保持接口兼容
export const getApiKey = (): string | null => SILICONFLOW_API_KEY;
export const setApiKey = (_apiKey: string): void => { };

/**
 * 使用 LLM 对节点进行聚类
 * @param nodes 当前画布上的所有节点
 * @returns Map<节点ID, 类别名称[]>
 */
export const clusterNodes = async (nodes: Node[]): Promise<Map<string, string[]>> => {
    if (nodes.length <= 1) return new Map();

    const nodeData = nodes.map(n => ({ id: n.id, text: n.text }));

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SILICONFLOW_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: [
                    {
                        role: 'system',
                        content: `你是一个逻辑分析专家。请对用户提供的词语进行分类（亲和图分析）。
要求：
1. 分析词语之间的语义相似性，将它们分成 2-5 个逻辑类别。
2. 返回 JSON 格式，格式为：{"category_name": ["node_id1", "node_id2"], ...}。
3. 每个节点必须且只能属于一个类别。
4. 不要返回任何解释文字，只返回纯 JSON。`
                    },
                    {
                        role: 'user',
                        content: JSON.stringify(nodeData)
                    }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.status}`);
        }

        const data = await response.json();
        const clustersJson = JSON.parse(data.choices[0].message.content);

        const clusterMap = new Map<string, string[]>();
        for (const [category, ids] of Object.entries(clustersJson)) {
            clusterMap.set(category, ids as string[]);
        }

        return clusterMap;
    } catch (error) {
        console.error('Clustering Error:', error);
        throw error;
    }
};
