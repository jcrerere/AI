import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const DEFAULT_IMPLICIT_KEYS = {
  addMemo: true,
  matchPersonaDescription: false,
  matchCharacterDescription: false,
  matchCharacterPersonality: false,
  matchCharacterDepthPrompt: false,
  matchScenario: false,
  matchCreatorNotes: false,
  group: '',
  groupOverride: false,
  groupWeight: 100,
  caseSensitive: null,
  matchWholeWords: null,
  useGroupScoring: null,
  automationId: '',
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = value;
    i += 1;
  }
  return args;
}

function readContent(baseDir, entry) {
  if (typeof entry.内容 === 'string') {
    return entry.内容.replace(/\r\n/g, '\n');
  }
  if (typeof entry.文件 !== 'string') {
    throw new Error(`条目 '${entry.名称}' 既没有 '内容' 也没有 '文件'`);
  }
  const filePath = path.resolve(baseDir, entry.文件);
  if (!fs.existsSync(filePath)) {
    throw new Error(`条目 '${entry.名称}' 的内容文件不存在: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '');
}

function mapStrategy(strategy = {}) {
  return {
    type:
      {
        蓝灯: 'constant',
        绿灯: 'selective',
        向量化: 'vectorized',
      }[strategy.类型] ?? 'constant',
    keys: Array.isArray(strategy.关键字) ? strategy.关键字 : [],
    keys_secondary: strategy.次要关键字
      ? {
          logic:
            {
              与任意: 'and_any',
              与所有: 'and_all',
              非所有: 'not_all',
              非任意: 'not_any',
            }[strategy.次要关键字.逻辑] ?? 'and_any',
          keys: Array.isArray(strategy.次要关键字.关键字) ? strategy.次要关键字.关键字 : [],
        }
      : undefined,
    scan_depth:
      typeof strategy.扫描深度 === 'number' && strategy.扫描深度 > 0 ? strategy.扫描深度 : undefined,
  };
}

function mapPosition(position = {}) {
  const type =
    {
      角色定义之前: 'before_character_definition',
      角色定义之后: 'after_character_definition',
      示例消息之前: 'before_example_messages',
      示例消息之后: 'after_example_messages',
      作者注释之前: 'before_author_note',
      作者注释之后: 'after_author_note',
      指定深度: 'at_depth',
    }[position.类型] ?? 'at_depth';

  const result = {
    type,
    order: typeof position.顺序 === 'number' ? position.顺序 : 100,
  };

  if (type === 'at_depth') {
    result.role =
      {
        系统: 'system',
        AI: 'assistant',
        用户: 'user',
      }[position.角色] ?? 'system';
    result.depth = typeof position.深度 === 'number' ? position.深度 : 4;
  }

  return result;
}

function mapRecursion(recursion) {
  if (!recursion) return undefined;
  const result = {};
  if (recursion.不可被其他条目激活 === true) result.prevent_incoming = true;
  if (recursion.不可激活其他条目 === true) result.prevent_outgoing = true;
  if (typeof recursion.延迟递归 === 'number' && recursion.延迟递归 > 0) {
    result.delay_until = recursion.延迟递归;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function mapEffect(effect) {
  if (!effect) return undefined;
  const result = {};
  if (typeof effect.黏性 === 'number' && effect.黏性 > 0) result.sticky = effect.黏性;
  if (typeof effect.冷却 === 'number' && effect.冷却 > 0) result.cooldown = effect.冷却;
  if (typeof effect.延迟 === 'number' && effect.延迟 > 0) result.delay = effect.延迟;
  return Object.keys(result).length > 0 ? result : undefined;
}

function mapGroup(group) {
  if (!group || !Array.isArray(group.组标签) || group.组标签.length === 0) return undefined;
  const result = {
    labels: group.组标签,
  };
  if (group.使用优先级 === true) result.use_priority = true;
  if (typeof group.权重 === 'number') result.weight = group.权重;
  if (typeof group.使用评分 === 'boolean') result.use_scoring = group.使用评分;
  return result;
}

const args = parseArgs(process.argv.slice(2));
const indexPath = path.resolve(args.index ?? 'LNSJ/LNSJ-real/index.yaml');
const outputPath = path.resolve(args.output ?? 'LNSJ/LNSJ-real/LNSJ-real.json');

if (!fs.existsSync(indexPath)) {
  throw new Error(`LNSJ index file not found: ${indexPath}`);
}

const indexText = fs.readFileSync(indexPath, 'utf8');
const doc = YAML.parse(indexText);
const entries = Array.isArray(doc.条目) ? doc.条目 : [];
const baseDir = path.dirname(indexPath);

const bundledEntries = Object.fromEntries(
  entries.map((entry, index) => {
    const strategy = mapStrategy(entry.激活策略);
    const position = mapPosition(entry.插入位置);
    const recursion = mapRecursion(entry.递归);
    const effect = mapEffect(entry.特殊效果);
    const group = mapGroup(entry.群组);

    const result = {
      uid: index,
      displayIndex: index,
      comment: entry.名称,
      disable: entry.启用 === false,
      constant: strategy.type === 'constant',
      selective: strategy.type === 'selective',
      key: strategy.keys ?? [],
      selectiveLogic:
        {
          and_any: 0,
          not_all: 1,
          not_any: 2,
          and_all: 3,
        }[strategy.keys_secondary?.logic ?? 'and_any'] ?? 0,
      keysecondary: strategy.keys_secondary?.keys ?? [],
      scanDepth: strategy.scan_depth ?? null,
      vectorized: strategy.type === 'vectorized',
      position:
        {
          before_character_definition: 0,
          after_character_definition: 1,
          before_author_note: 2,
          after_author_note: 3,
          at_depth: 4,
          before_example_messages: 5,
          after_example_messages: 6,
        }[position.type] ?? 4,
      role:
        {
          system: 0,
          user: 1,
          assistant: 2,
        }[position.role ?? 'system'] ?? 0,
      depth: position.depth ?? 4,
      order: position.order ?? 100,
      content: readContent(baseDir, entry),
      useProbability: true,
      probability: typeof entry.激活概率 === 'number' ? entry.激活概率 : 100,
      excludeRecursion: recursion?.prevent_incoming ?? false,
      preventRecursion: recursion?.prevent_outgoing ?? false,
      delayUntilRecursion: recursion?.delay_until ?? false,
      sticky: effect?.sticky ?? null,
      cooldown: effect?.cooldown ?? null,
      delay: effect?.delay ?? null,
      ...DEFAULT_IMPLICIT_KEYS,
    };

    if (group) {
      result.group = group.labels.join(',');
      result.groupOverride = group.use_priority ?? false;
      result.groupWeight = typeof group.weight === 'number' ? group.weight : 100;
      result.useGroupScoring =
        typeof group.use_scoring === 'boolean' ? group.use_scoring : null;
    }

    if (entry.额外字段 && typeof entry.额外字段 === 'object') {
      result.extra = entry.额外字段;
    }

    return [index, result];
  }),
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify({ entries: bundledEntries }, null, 2)}\n`, 'utf8');

console.log(
  JSON.stringify(
    {
      index: indexPath,
      output: outputPath,
      entryCount: entries.length,
    },
    null,
    2,
  ),
);
