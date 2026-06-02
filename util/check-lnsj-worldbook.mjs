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

function stripRegionPrefix(value) {
  return String(value ?? '').replace(/^区域_/, '');
}

function stripFacilityPrefix(value) {
  return String(value ?? '').replace(/^设施_中尺度_/, '').replace(/^设施_/, '');
}

function parseFacilityMeta(content) {
  const originalName =
    content.match(/^原始地名:\s*(.+)$/m)?.[1]?.trim() ??
    content.match(/^名称:\s*(.+)$/m)?.[1]?.trim() ??
    '';
  const region = content.match(/^所属区域:\s*(.+)$/m)?.[1]?.trim() ?? '';
  const scale = content.match(/^尺度版本:\s*(.+)$/m)?.[1]?.trim() ?? '';
  return { originalName, region, scale };
}

function detectOwnerRegions(regionText, regionNames) {
  return [...regionNames].filter((regionName) => regionText.includes(regionName));
}

function findLineNumbers(text, pattern) {
  return text
    .split(/\r?\n/)
    .flatMap((line, index) => (pattern.test(line) ? [index + 1] : []));
}

function toMarkdownTable(rows) {
  const header = ['级别', '类型', '条目', '说明'];
  const body = rows.map((row) => [
    row.level,
    row.type,
    row.entry,
    row.message.replace(/\|/g, '\\|'),
  ]);
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

const REQUIRED_BRIDGE_ENTRIES = [
  {
    name: '[mvu_update]变量回合更新',
    file: 'entries/mvu/027_mvu_update_变量回合更新.yaml',
  },
  {
    name: '[initvar+mvu]变量初始化与回合更新',
    file: 'entries/mvu/028_initvar_mvu_变量初始化与回合更新.yaml',
  },
  {
    name: '[mvu_update]变量更新规则',
    file: 'entries/mvu/040_mvu_update_变量更新规则.yaml',
  },
  {
    name: '[mvu_update]变量输出格式',
    file: 'entries/mvu/041_mvu_update_变量输出格式.yaml',
  },
  {
    name: '[mvu_update]正式流程CoT',
    file: 'entries/mvu/042_mvu_update_正式流程CoT.ini',
  },
  {
    name: 'WORLD_机制_SUM模块',
    file: 'entries/mechanics/044_WORLD_机制_SUM模块.txt',
  },
  {
    name: 'WORLD_机制_玩家状态栏',
    file: 'entries/mechanics/045_WORLD_机制_玩家状态栏.txt',
  },
  {
    name: '机制_时间月度结算（统一）',
    file: 'entries/mechanics/063_机制_时间月度结算_统一.yaml',
  },
  {
    name: '机制_住所系统（统一）',
    file: 'entries/mechanics/064_机制_住所系统_统一.yaml',
  },
  {
    name: '机制_区域接口与场景进入（统一）',
    file: 'entries/mechanics/092_机制_区域接口与场景进入_统一.yaml',
  },
];

const REQUIRED_ENTRY_SNIPPETS = [
  {
    name: '[mvu_update]变量输出格式',
    snippets: ['<maintext>', '<ui_actions>', '<sum>', '<UpdateVariable>', '/stat_data'],
  },
  {
    name: '[mvu_update]正式流程CoT',
    snippets: ['<maintext>', '<ui_actions>', '<sum>', '<UpdateVariable>'],
  },
  {
    name: '[mvu_update]变量更新规则',
    snippets: ['root_path: stat_data', 'world.current_location', 'player.residence'],
  },
  {
    name: 'WORLD_机制_SUM模块',
    snippets: ['<sum>', '楼层摘要模块', '下一步悬念'],
  },
  {
    name: 'WORLD_机制_玩家状态栏',
    snippets: ['stat_data', '<UpdateVariable>', '状态栏只显示结构化结果'],
  },
];

const args = parseArgs(process.argv.slice(2));
const indexPath = path.resolve(args.index ?? 'LNSJ/LNSJ-real/index.yaml');
const outputPath = path.resolve(args.output ?? 'LNSJ/LNSJ-real/TRIGGER_AUDIT.md');

if (!fs.existsSync(indexPath)) {
  throw new Error(`LNSJ index file not found: ${indexPath}`);
}

const indexText = fs.readFileSync(indexPath, 'utf8');
const doc = YAML.parse(indexText);
const entries = Array.isArray(doc.条目) ? doc.条目 : [];
const regionEntries = entries.filter((entry) =>
  String(entry.文件 ?? '').includes('entries/regions/'),
);
const facilityEntries = entries.filter((entry) =>
  String(entry.文件 ?? '').includes('entries/facilities/'),
);
const entryByName = new Map(entries.map((entry) => [String(entry.名称 ?? ''), entry]));

const regionNames = new Set(regionEntries.map((entry) => stripRegionPrefix(entry.名称)));
const regionKeywords = new Map(
  regionEntries.map((entry) => [
    stripRegionPrefix(entry.名称),
    new Set((entry.激活策略?.关键字 ?? []).map(String)),
  ]),
);

const findings = [];

for (const required of REQUIRED_BRIDGE_ENTRIES) {
  const entry = entryByName.get(required.name);
  if (!entry) {
    findings.push({
      level: 'error',
      type: '缺少必备桥接条目',
      entry: required.name,
      message: `index.yaml 中缺少必备条目，预期文件为 ${required.file}。`,
    });
    continue;
  }

  if (entry.启用 !== true) {
    findings.push({
      level: 'error',
      type: '桥接条目未启用',
      entry: required.name,
      message: `条目已存在但未启用，闭环运行会缺少关键桥接。`,
    });
  }

  const actualFile = String(entry.文件 ?? '');
  if (actualFile !== required.file) {
    findings.push({
      level: 'error',
      type: '桥接条目文件异常',
      entry: required.name,
      message: `预期文件为 ${required.file}，当前为 ${actualFile || '(未填写)'}。`,
    });
  }

  const resolvedFilePath = path.resolve(path.dirname(indexPath), actualFile || required.file);
  if (!fs.existsSync(resolvedFilePath)) {
    findings.push({
      level: 'error',
      type: '桥接条目文件缺失',
      entry: required.name,
      message: `文件 ${actualFile || required.file} 不存在，无法完成闭环装配。`,
    });
  }
}

for (const required of REQUIRED_ENTRY_SNIPPETS) {
  const entry = entryByName.get(required.name);
  if (!entry) continue;
  const filePath = path.resolve(path.dirname(indexPath), String(entry.文件 ?? ''));
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  const missing = required.snippets.filter(snippet => !content.includes(snippet));
  if (missing.length > 0) {
    findings.push({
      level: 'error',
      type: '桥接条目内容缺失',
      entry: required.name,
      message: `文件 ${entry.文件} 缺少关键片段：${missing.join('、')}。`,
    });
  }
}

for (const lineNumber of findLineNumbers(indexText, /^\s*关键词:/)) {
  findings.push({
    level: 'error',
    type: '字段名错误',
    entry: `index.yaml:${lineNumber}`,
    message: '发现“关键词”字段，应统一使用“关键字”。',
  });
}

for (const entry of facilityEntries) {
  const filePath = path.resolve(path.dirname(indexPath), String(entry.文件));
  if (!fs.existsSync(filePath)) {
    findings.push({
      level: 'error',
      type: '设施文件缺失',
      entry: String(entry.名称),
      message: `文件 ${entry.文件} 不存在，无法校验设施触发词。`,
    });
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const { originalName, region } = parseFacilityMeta(content);
  const entryName = stripFacilityPrefix(entry.名称);
  const expectedKeyword = originalName || entryName;
  const keywords = (entry.激活策略?.关键字 ?? []).map(String);
  const ownerRegions = detectOwnerRegions(region, regionNames);

  if (!region) {
    findings.push({
      level: 'error',
      type: '缺少所属区域',
      entry: String(entry.名称),
      message: `文件 ${entry.文件} 未声明“所属区域”。`,
    });
    continue;
  }

  if (!regionNames.has(region) && ownerRegions.length === 0) {
    findings.push({
      level: 'error',
      type: '未知所属区域',
      entry: String(entry.名称),
      message: `设施所属区域“${region}”未在 index.yaml 的区域条目中定义。`,
    });
  }

  const regionHits = keywords.filter((keyword) => regionNames.has(keyword));
  if (regionHits.length > 0) {
    findings.push({
      level: 'error',
      type: '设施误挂地区词',
      entry: String(entry.名称),
      message: `设施关键字中包含地区名：${regionHits.join('、')}。`,
    });
  }

  if (!keywords.includes(expectedKeyword)) {
    findings.push({
      level: 'error',
      type: '设施缺少自身触发词',
      entry: String(entry.名称),
      message: `设施关键字未包含自身主名“${expectedKeyword}”。`,
    });
  }

  if (ownerRegions.length === 1) {
    const ownerRegionKeywords = regionKeywords.get(ownerRegions[0]);
    if (ownerRegionKeywords && !ownerRegionKeywords.has(expectedKeyword)) {
      findings.push({
        level: 'error',
        type: '区域未挂地点名',
        entry: String(entry.名称),
        message: `所属区域“${ownerRegions[0]}”的关键字未包含地点名“${expectedKeyword}”。`,
      });
    }
  } else if (ownerRegions.length === 0 && regionKeywords.get(region) && !regionKeywords.get(region).has(expectedKeyword)) {
    findings.push({
      level: 'error',
      type: '区域未挂地点名',
      entry: String(entry.名称),
      message: `所属区域“${region}”的关键字未包含地点名“${expectedKeyword}”。`,
    });
  }
}

const summary = {
  bridgeEntryCount: REQUIRED_BRIDGE_ENTRIES.length,
  regionCount: regionEntries.length,
  facilityCount: facilityEntries.length,
  findingCount: findings.length,
};

const report = [
  '# LNSJ 触发词校验',
  '',
  `生成时间: ${new Date().toISOString()}`,
  '',
  '## 校验规则',
  '',
  '- MVU / SUM / 状态栏 / 区域接口等闭环桥接条目必须存在、启用，且指向预期文件。',
  '- 关键桥接条目还必须保留最小内容契约，避免输出结构或 stat_data 约定漂移。',
  '- 区域条目可被本区地点名触发。',
  '- 设施条目只挂地点自身、机构词、功能词，不挂地区名。',
  '- 每个设施条目必须声明所属区域，并至少保留一个自身主名触发词。',
  '',
  '## 汇总',
  '',
  `- 闭环桥接条目: ${summary.bridgeEntryCount}`,
  `- 区域条目: ${summary.regionCount}`,
  `- 设施条目: ${summary.facilityCount}`,
  `- 发现问题: ${summary.findingCount}`,
  '',
  '## 结果',
  '',
  findings.length === 0
    ? '当前结构通过校验，未发现闭环桥接缺项、地区误触发地点或地点漏挂区域的异常。'
    : toMarkdownTable(findings),
  '',
].join('\n');

fs.writeFileSync(outputPath, report, 'utf8');
console.log(
  JSON.stringify(
    {
      index: indexPath,
      output: outputPath,
      ...summary,
    },
    null,
    2,
  ),
);

if (findings.length > 0) {
  process.exitCode = 1;
}
