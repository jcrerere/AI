export interface ParsedPseudoLayer {
  maintext: string;
  options: string[];
  sum: string;
}

const readTag = (content: string, tag: string): string => {
  const reg = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = content.match(reg);
  return match?.[1]?.trim() || '';
};

export const hasPseudoLayer = (content: string): boolean => /<maintext>[\s\S]*<\/maintext>/i.test(content);

export const parsePseudoLayer = (content: string): ParsedPseudoLayer => {
  const maintext = readTag(content, 'maintext');
  const optionText = readTag(content, 'option');
  const sum = readTag(content, 'sum');
  const options = optionText
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.replace(/^\s*[-*]\s*/, ''))
    .filter(Boolean);
  return { maintext, options, sum };
};

export const replaceMaintext = (content: string, nextMaintext: string): string => {
  if (!hasPseudoLayer(content)) return content;
  return content.replace(/<maintext>[\s\S]*?<\/maintext>/i, `<maintext>\n${nextMaintext.trim()}\n</maintext>`);
};

export interface BuildLayerInput {
  playerInput: string;
  location: string;
  credits: number;
  reputation: number;
  gameTime?: string;
  dayPhase?: string;
  sceneHint?: string;
}

export const buildPseudoLayer = (input: BuildLayerInput): string => {
  const cleanInput = input.playerInput.trim();
  const maintext = [
    `你在${input.location}继续行动。街区上空的霓虹与雾气把视野切成碎片，空气里有电流焦味。`,
    input.gameTime ? `当前时间：${input.gameTime}${input.dayPhase ? `（${input.dayPhase}）` : ''}` : '',
    input.sceneHint ? `场景变化：${input.sceneHint}` : '',
    `你刚刚决定：${cleanInput}。这一步引来了附近人的注意，也让局势进入可判定状态。`,
    `你能感到自己的资源正在被现实规则拉扯：信誉=${input.reputation}，灵能币=${input.credits}。`,
    '前方出现了新的节点，你必须立刻判断是继续推进，还是先稳住状态。',
  ]
    .filter(Boolean)
    .join('\n');

  const optionLines = [
    'A. 直接推进：不计代价执行当前目标（高收益，高风险）',
    'B. 稳妥处理：先收集线索与周边反馈（中收益，低风险）',
    'C. 资源调整：优先恢复状态或补充资源（低收益，稳定）',
  ].join('\n');

  const sum = `地点:${input.location} | 时间:${input.gameTime || '未知'} | 行动:${cleanInput} | 状态:信誉${input.reputation}/币${input.credits}`;

  return `<maintext>\n${maintext}\n</maintext>\n\n<option>\n${optionLines}\n</option>\n\n<sum>${sum}</sum>`;
};
