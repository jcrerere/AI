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
  const safeInput = cleanInput || '继续推进当前局势';
  const maintext = [
    `已记录玩家动作：${safeInput}。`,
    '当前为系统占位正文，仅用于保持楼层结构连续，不代表最终叙事文风。',
    input.sceneHint ? `场景参考：${input.sceneHint}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const optionLines = [
    'A. 推进当前行动',
    'B. 调查环境线索',
    'C. 进行状态整备',
  ].join('\n');

  const sum = `地点:${input.location} | 时间:${input.gameTime || '未知'} | 行动:${safeInput} | 状态:信誉${input.reputation}/币${input.credits}`;

  return `<maintext>\n${maintext}\n</maintext>\n\n<option>\n${optionLines}\n</option>\n\n<sum>${sum}</sum>`;
};
