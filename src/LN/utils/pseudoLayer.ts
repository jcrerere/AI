export interface ParsedPseudoLayer {
  maintext: string;
  sum: string;
  npcdata: string;
}

const readTag = (content: string, tag: string): string => {
  const reg = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = content.match(reg);
  return match?.[1]?.trim() || '';
};

export const hasPseudoLayer = (content: string): boolean => /<maintext>[\s\S]*<\/maintext>/i.test(content);

export const parsePseudoLayer = (content: string): ParsedPseudoLayer => {
  const maintext = readTag(content, 'maintext');
  const sum = readTag(content, 'sum');
  const npcdata = readTag(content, 'npcdata');
  return { maintext, sum, npcdata };
};

export const replaceMaintext = (content: string, nextMaintext: string): string => {
  if (!hasPseudoLayer(content)) return content;
  return content.replace(/<maintext>[\s\S]*?<\/maintext>/i, `<maintext>\n${nextMaintext.trim()}\n</maintext>`);
};

export const replaceNpcData = (content: string, nextNpcData: string): string => {
  if (!hasPseudoLayer(content)) return content;
  const trimmed = nextNpcData.trim();
  const block = trimmed ? `<npcdata>\n${trimmed}\n</npcdata>` : '';

  if (/<npcdata>[\s\S]*?<\/npcdata>/i.test(content)) {
    if (!block) {
      return content.replace(/\n*\s*<npcdata>[\s\S]*?<\/npcdata>\s*\n*/i, '\n').trim();
    }
    return content.replace(/<npcdata>[\s\S]*?<\/npcdata>/i, block);
  }

  if (!block) return content;
  if (/<sum>[\s\S]*?<\/sum>/i.test(content)) {
    return content.replace(/<sum>[\s\S]*?<\/sum>/i, `${block}\n\n$&`);
  }
  return `${content.trim()}\n\n${block}`;
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
    cleanInput ? `已记录玩家动作：${cleanInput}。` : '已收到基于当前上下文的续写请求。',
    '当前为系统占位正文，仅用于保持楼层结构连续。',
    input.sceneHint ? `场景参考：${input.sceneHint}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const sumParts = [
    `地点:${input.location}`,
    `时间:${input.gameTime || '未知'}`,
    cleanInput ? `行动:${cleanInput}` : '',
    `状态:信誉${input.reputation}/币${input.credits}`,
  ].filter(Boolean);

  return `<maintext>\n${maintext}\n</maintext>\n\n<sum>${sumParts.join(' | ')}</sum>`;
};
