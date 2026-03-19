import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

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

function sanitizeName(value) {
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, '_')
    .replace(/[\[\]\(\)\{\}\+]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function detectCategory(name) {
  if (name.startsWith('[mvu_update]') || name.startsWith('[initvar+mvu]')) return 'mvu';
  if (name.startsWith('WORLD_事件_')) return 'events';
  if (name.startsWith('WORLD_机制_') || name.startsWith('机制_')) return 'mechanics';
  if (name.startsWith('势力_')) return 'factions';
  if (name.startsWith('区域_')) return 'regions';
  if (name.startsWith('国家_')) return 'countries';
  if (name.startsWith('机关_')) return 'institutions';
  if (name.startsWith('职业')) return 'professions';
  if (name.startsWith('灵族_')) return 'species';
  if (name === '汐屿族') return 'cultures';

  const mechanismNames = new Set([
    '世界概述',
    '灵能',
    '灵核',
    '灵枢',
    '灵能币',
    '灵弦',
    '灵能吸取结算',
    '灵能币跨级汇率',
    '灵能币兑换局',
    '淬灵区灵能币工艺',
  ]);
  if (mechanismNames.has(name)) return 'mechanics';

  return 'misc';
}

function detectExtension(name, content) {
  const trimmed = String(content ?? '').trimStart();
  if (/CoT/i.test(name) || trimmed.startsWith('```ini')) return '.ini';
  if (
    trimmed.startsWith('```yaml') ||
    trimmed.startsWith('```yml') ||
    trimmed.startsWith('---\n') ||
    trimmed.startsWith('---\r\n')
  ) {
    return '.yaml';
  }
  return '.txt';
}

function buildStrategy(entry) {
  const strategy = {
    类型: entry.vectorized ? '向量化' : entry.selective ? '绿灯' : '蓝灯',
  };
  if (Array.isArray(entry.key) && entry.key.length > 0) {
    strategy.关键字 = entry.key;
  }
  if (Array.isArray(entry.keysecondary) && entry.keysecondary.length > 0) {
    strategy.次要关键字 = {
      逻辑:
        {
          0: '与任意',
          1: '非所有',
          2: '非任意',
          3: '与所有',
        }[entry.selectiveLogic ?? 0] ?? '与任意',
      关键字: entry.keysecondary,
    };
  }
  if (typeof entry.scanDepth === 'number' && entry.scanDepth > 0) {
    strategy.扫描深度 = entry.scanDepth;
  }
  return strategy;
}

function buildPosition(entry) {
  const position = {
    类型:
      {
        0: '角色定义之前',
        1: '角色定义之后',
        2: '作者注释之前',
        3: '作者注释之后',
        4: '指定深度',
        5: '示例消息之前',
        6: '示例消息之后',
      }[entry.position] ?? '指定深度',
    顺序: entry.order ?? 100,
  };
  if (position.类型 === '指定深度') {
    position.角色 =
      {
        0: '系统',
        1: '用户',
        2: 'AI',
      }[entry.role] ?? '系统';
    position.深度 = entry.depth ?? 4;
  }
  return position;
}

function buildRecursion(entry) {
  const recursion = {};
  if (entry.excludeRecursion) recursion.不可被其他条目激活 = true;
  if (entry.preventRecursion) recursion.不可激活其他条目 = true;
  if (typeof entry.delayUntilRecursion === 'number' && entry.delayUntilRecursion > 0) {
    recursion.延迟递归 = entry.delayUntilRecursion;
  }
  return recursion;
}

function buildEffect(entry) {
  const effect = {};
  if (typeof entry.sticky === 'number' && entry.sticky > 0) effect.黏性 = entry.sticky;
  if (typeof entry.cooldown === 'number' && entry.cooldown > 0) effect.冷却 = entry.cooldown;
  if (typeof entry.delay === 'number' && entry.delay > 0) effect.延迟 = entry.delay;
  return effect;
}

function buildGroup(entry) {
  if (typeof entry.group !== 'string') return null;
  const labels = entry.group
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (labels.length === 0) return null;

  const group = { 组标签: labels };
  if (entry.groupOverride === true) group.使用优先级 = true;
  if (typeof entry.groupWeight === 'number' && entry.groupWeight !== 100) group.权重 = entry.groupWeight;
  if (typeof entry.useGroupScoring === 'boolean') group.使用评分 = entry.useGroupScoring;
  return group;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

const args = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(args.source ?? 'LNSJ/LNSJ-back/live_worldinfo.json');
const outputDir = path.resolve(args.output ?? 'LNSJ/LNSJ-real');

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Source worldbook snapshot not found: ${sourcePath}`);
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const sourceEntries = Object.entries(source.entries ?? {})
  .map(([key, entry]) => ({
    ...entry,
    __index: Number(key),
  }))
  .sort((left, right) => {
    const a = left.displayIndex ?? left.uid ?? left.__index;
    const b = right.displayIndex ?? right.uid ?? right.__index;
    return a - b;
  });

const nameCounts = new Map();
for (const entry of sourceEntries) {
  const name = entry.comment ?? '';
  nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
}

fs.rmSync(path.join(outputDir, 'entries'), { recursive: true, force: true });
fs.rmSync(path.join(outputDir, 'index.yaml'), { force: true });

const yamlEntries = sourceEntries.map((entry, idx) => {
  const order = String(idx).padStart(3, '0');
  const name = entry.comment ?? `条目_${order}`;
  const safeName = sanitizeName(name) || `条目_${order}`;
  const duplicateSuffix =
    (nameCounts.get(name) ?? 0) > 1 ? `_uid${entry.uid ?? idx}` : '';
  const category = detectCategory(name);
  const extension = detectExtension(name, entry.content);
  const relativeFile = path.posix.join(
    'entries',
    category,
    `${order}_${safeName}${duplicateSuffix}${extension}`,
  );
  const absoluteFile = path.join(outputDir, ...relativeFile.split('/'));

  writeFile(absoluteFile, `${String(entry.content ?? '').replace(/\r\n/g, '\n')}\n`);

  const yamlEntry = {
    名称: name,
    uid: entry.uid,
    启用: !entry.disable,
    激活策略: buildStrategy(entry),
    插入位置: buildPosition(entry),
    文件: relativeFile,
  };

  if (entry.useProbability !== false && typeof entry.probability === 'number' && entry.probability !== 100) {
    yamlEntry.激活概率 = entry.probability;
  }

  const recursion = buildRecursion(entry);
  if (Object.keys(recursion).length > 0) yamlEntry.递归 = recursion;

  const effect = buildEffect(entry);
  if (Object.keys(effect).length > 0) yamlEntry.特殊效果 = effect;

  const group = buildGroup(entry);
  if (group) yamlEntry.群组 = group;

  if (entry.extra && typeof entry.extra === 'object' && Object.keys(entry.extra).length > 0) {
    yamlEntry.额外字段 = entry.extra;
  }

  return yamlEntry;
});

const yamlContent = [
  '# yaml-language-server: $schema=https://testingcf.jsdelivr.net/gh/StageDog/tavern_sync/dist/schema/worldbook.zh.json',
  '# LNSJ-real 是本地可编辑主源。角色卡绑定的是酒馆内的世界书；本地修改完成后，需要先 bundle，再由你手动导入酒馆。',
  '# 重新生成本结构的命令示例：node util/rebuild-lnsj-worldbook.mjs --source LNSJ/LNSJ-back/raw/live_worldinfo.json --output LNSJ/LNSJ-real',
  YAML.stringify({ 条目: yamlEntries }, { lineWidth: 0 }).trimEnd(),
  '',
].join('\n');

writeFile(path.join(outputDir, 'index.yaml'), yamlContent);

console.log(
  JSON.stringify(
    {
      source: sourcePath,
      output: outputDir,
      entryCount: yamlEntries.length,
    },
    null,
    2,
  ),
);
