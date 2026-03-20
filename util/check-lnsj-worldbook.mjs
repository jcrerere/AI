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

const regionNames = new Set(regionEntries.map((entry) => stripRegionPrefix(entry.名称)));
const regionKeywords = new Map(
  regionEntries.map((entry) => [
    stripRegionPrefix(entry.名称),
    new Set((entry.激活策略?.关键字 ?? []).map(String)),
  ]),
);

const findings = [];

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
  '- 区域条目可被本区地点名触发。',
  '- 设施条目只挂地点自身、机构词、功能词，不挂地区名。',
  '- 每个设施条目必须声明所属区域，并至少保留一个自身主名触发词。',
  '',
  '## 汇总',
  '',
  `- 区域条目: ${summary.regionCount}`,
  `- 设施条目: ${summary.facilityCount}`,
  `- 发现问题: ${summary.findingCount}`,
  '',
  '## 结果',
  '',
  findings.length === 0
    ? '当前结构通过校验，未发现地区误触发地点或地点漏挂区域的异常。'
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
