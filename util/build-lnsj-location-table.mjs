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

function classifyFacility(entryName, meta) {
  if (meta.scale === '中尺度' || entryName.startsWith('中尺度_')) return '中尺度草案';
  if (
    new Set(['X号性控所', 'HX男奴公寓', '跨区关卡桥梁网络', '黑玫瑰暗层联席网']).has(
      entryName,
    )
  ) {
    return '体系/网络';
  }
  return '正式锚点';
}

function buildMarkdownTable(header, rows) {
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

const args = parseArgs(process.argv.slice(2));
const indexPath = path.resolve(args.index ?? 'LNSJ/LNSJ-real/index.yaml');
const outputPath = path.resolve(args.output ?? 'LNSJ/LNSJ-real/LOCATION_TABLE.md');

if (!fs.existsSync(indexPath)) {
  throw new Error(`LNSJ index file not found: ${indexPath}`);
}

const indexText = fs.readFileSync(indexPath, 'utf8');
const doc = YAML.parse(indexText);
const entries = Array.isArray(doc.条目) ? doc.条目 : [];
const regionEntries = entries.filter((entry) =>
  String(entry.文件 ?? '').includes('entries/regions/'),
);
const regionNames = new Set(regionEntries.map((entry) => stripRegionPrefix(entry.名称)));
const facilityEntries = entries
  .filter((entry) => String(entry.文件 ?? '').includes('entries/facilities/'))
  .map((entry) => {
    const filePath = path.resolve(path.dirname(indexPath), String(entry.文件));
    const content = fs.readFileSync(filePath, 'utf8');
    const meta = parseFacilityMeta(content);
    const entryName = stripFacilityPrefix(entry.名称);
    const ownerRegions = detectOwnerRegions(meta.region, regionNames);
    const tableRegion =
      ownerRegions.length === 1
        ? ownerRegions[0]
        : ownerRegions.length > 1
          ? '跨区/多区网络'
          : meta.region || '未归属';
    return {
      uid: entry.uid,
      indexName: String(entry.名称),
      name: meta.originalName || entryName,
      region: tableRegion,
      category: classifyFacility(entryName, meta),
      file: String(entry.文件),
    };
  });

const grouped = new Map(
  regionEntries.map((entry) => [stripRegionPrefix(entry.名称), []]),
);
grouped.set('跨区/多区网络', []);
for (const facility of facilityEntries) {
  if (!grouped.has(facility.region)) grouped.set(facility.region, []);
  grouped.get(facility.region).push(facility);
}
for (const facilities of grouped.values()) {
  facilities.sort((left, right) => Number(left.uid ?? 0) - Number(right.uid ?? 0));
}

const summaryRows = Array.from(grouped.entries()).map(([region, facilities]) => {
  const formal = facilities.filter((item) => item.category === '正式锚点').length;
  const medium = facilities.filter((item) => item.category === '中尺度草案').length;
  const systems = facilities.filter((item) => item.category === '体系/网络').length;
  return [region, String(facilities.length), String(formal), String(medium), String(systems)];
});

const detailSections = Array.from(grouped.entries()).map(([region, facilities]) => {
  const rows =
    facilities.length === 0
      ? ['当前未单列设施条目。']
      : [
          buildMarkdownTable(
            ['uid', '地点', '类型', '索引名', '文件'],
            facilities.map((item) => [
              String(item.uid ?? ''),
              item.name,
              item.category,
              item.indexName,
              item.file,
            ]),
          ),
        ];
  return [`## ${region}`, '', ...rows, ''].join('\n');
});

const markdown = [
  '# LNSJ 地区地点总表',
  '',
  `生成时间: ${new Date().toISOString()}`,
  '',
  '## 维护规则',
  '',
  '- 区域条目挂地点名，用于“提到地点时顺带触发区域背景”。',
  '- 设施条目不挂地区名，用于“只在真正提到地点时展开细节”。',
  '- 中尺度条目只保留草案功能，后续再按需要升格成正式锚点。',
  '',
  '## 区域汇总',
  '',
  buildMarkdownTable(['区域', '地点总数', '正式锚点', '中尺度草案', '体系/网络'], summaryRows),
  '',
  '## 分区明细',
  '',
  ...detailSections,
].join('\n');

fs.writeFileSync(outputPath, `${markdown}\n`, 'utf8');
console.log(
  JSON.stringify(
    {
      index: indexPath,
      output: outputPath,
      regionCount: grouped.size,
      facilityCount: facilityEntries.length,
    },
    null,
    2,
  ),
);
