export type JurisdictionTone = 'cyan' | 'emerald' | 'amber' | 'fuchsia' | 'slate';

export interface JurisdictionStatusChip {
  label: string;
  value: string;
}

export interface JurisdictionStatus {
  key: string;
  regionLabel: string;
  tone: JurisdictionTone;
  summary: string;
  chips: JurisdictionStatusChip[];
}

const DEFAULT_STATUS: JurisdictionStatus = {
  key: 'default',
  regionLabel: '未锁定法域',
  tone: 'slate',
  summary: '当前地点尚未绑定完整法域规则，优先参考系统提示和楼层小结。',
  chips: [
    { label: '协议', value: '待判定' },
    { label: '宵禁', value: '未明确' },
    { label: '税务', value: '待判定' },
    { label: '兑换', value: '待判定' },
    { label: '执法', value: '中性' },
    { label: '风险', value: '观察' },
  ],
};

const JURISDICTION_MAP: Array<{
  match: RegExp;
  status: JurisdictionStatus;
}> = [
  {
    match: /(艾瑞拉|北门|中环|旧港|南港|首都|X\d{1,2}性控所|H\d{1,3}男奴公寓)/,
    status: {
      key: 'aerila',
      regionLabel: '艾瑞拉法域',
      tone: 'cyan',
      summary: '首都高压秩序区。Beta 协议、夜间抽查、税务绑定和官方兑换都最强势。',
      chips: [
        { label: '协议', value: 'Beta主导' },
        { label: '宵禁', value: '夜查严格' },
        { label: '税务', value: '夜莺税链' },
        { label: '兑换', value: '官方开放' },
        { label: '执法', value: '高压' },
        { label: '风险', value: '毒素区' },
      ],
    },
  },
  {
    match: /(淬灵)/,
    status: {
      key: 'cuiling',
      regionLabel: '淬灵区法域',
      tone: 'amber',
      summary: '压缩与分解中枢。官方设施可信，但跨级兑换、分解与票据核验更受监管。',
      chips: [
        { label: '协议', value: '工业监管' },
        { label: '宵禁', value: '常规' },
        { label: '税务', value: '票据留痕' },
        { label: '兑换', value: '官方优先' },
        { label: '执法', value: '中高' },
        { label: '风险', value: '工序审计' },
      ],
    },
  },
  {
    match: /(汐屿|灰堤|观海|港区)/,
    status: {
      key: 'xiyu',
      regionLabel: '汐屿区法域',
      tone: 'emerald',
      summary: '港口与旅游混合区。更看重边检、证件和消费秩序，而不是当场高压镇压。',
      chips: [
        { label: '协议', value: '边检优先' },
        { label: '宵禁', value: '港巡制' },
        { label: '税务', value: '口岸抽查' },
        { label: '兑换', value: '0.55x' },
        { label: '执法', value: '中等' },
        { label: '风险', value: '证件核验' },
      ],
    },
  },
  {
    match: /(诺丝|罪吻|工业带|星轨|金丝)/,
    status: {
      key: 'north',
      regionLabel: '诺丝区法域',
      tone: 'fuchsia',
      summary: '半自治商业灰区。官方汇率更低，黑市与灰网活跃，执法存在弹性和买通空间。',
      chips: [
        { label: '协议', value: '半自治' },
        { label: '宵禁', value: '无硬夜禁' },
        { label: '税务', value: '商会抽成' },
        { label: '兑换', value: '0.45x' },
        { label: '执法', value: '弹性' },
        { label: '风险', value: '灰产高活' },
      ],
    },
  },
  {
    match: /(圣教)/,
    status: {
      key: 'holy',
      regionLabel: '圣教区法域',
      tone: 'amber',
      summary: '教律高压区。灵能币禁兑，公开欲望和越界交易会直接抬高追责等级。',
      chips: [
        { label: '协议', value: '教律审查' },
        { label: '宵禁', value: '夜巡严密' },
        { label: '税务', value: '教会征收' },
        { label: '兑换', value: '禁兑' },
        { label: '执法', value: '高压' },
        { label: '风险', value: '教义追责' },
      ],
    },
  },
  {
    match: /(交界地|狗镇|南荒|边境|冒险者公会)/,
    status: {
      key: 'borderland',
      regionLabel: '交界地法域',
      tone: 'slate',
      summary: '法域真空地带。更像势力自治和生存秩序，黑市、委托和荒野风险会盖过官方规则。',
      chips: [
        { label: '协议', value: '势力自治' },
        { label: '宵禁', value: '无统一夜禁' },
        { label: '税务', value: '狗镇抽成' },
        { label: '兑换', value: '民间兑换' },
        { label: '执法', value: '碎片化' },
        { label: '风险', value: '荒野高危' },
      ],
    },
  },
];

export const resolveLocationJurisdiction = (location: string): JurisdictionStatus => {
  const text = `${location || ''}`.trim();
  if (!text) return DEFAULT_STATUS;
  const matched = JURISDICTION_MAP.find(item => item.match.test(text));
  return matched?.status || DEFAULT_STATUS;
};
