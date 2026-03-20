export interface ParsedPseudoLayer {
  maintext: string;
  sum: string;
  npcdata: string;
  uiActions: string;
}

export interface PseudoLayerParts {
  maintext: string;
  sum?: string;
  npcdata?: string;
  uiActions?: string;
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
  const uiActions = readTag(content, 'ui_actions');
  return { maintext, sum, npcdata, uiActions };
};

export const buildPseudoLayerFromParts = ({ maintext, sum, npcdata, uiActions }: PseudoLayerParts): string => {
  const blocks = [`<maintext>\n${maintext.trim()}\n</maintext>`];

  if ((npcdata || '').trim()) {
    blocks.push(`<npcdata>\n${npcdata!.trim()}\n</npcdata>`);
  }

  if ((sum || '').trim()) {
    blocks.push(`<sum>${sum!.trim()}</sum>`);
  }

  if ((uiActions || '').trim()) {
    blocks.push(`<ui_actions>\n${uiActions!.trim()}\n</ui_actions>`);
  }

  return blocks.join('\n\n');
};

export const replaceMaintext = (content: string, nextMaintext: string): string => {
  if (!hasPseudoLayer(content)) return content;
  return content.replace(/<maintext>[\s\S]*?<\/maintext>/i, `<maintext>\n${nextMaintext.trim()}\n</maintext>`);
};

export const replaceSum = (content: string, nextSum: string): string => {
  if (!hasPseudoLayer(content)) return content;
  const trimmed = nextSum.trim();
  const block = trimmed ? `<sum>${trimmed}</sum>` : '';

  if (/<sum>[\s\S]*?<\/sum>/i.test(content)) {
    if (!block) {
      return content.replace(/\n*\s*<sum>[\s\S]*?<\/sum>\s*\n*/i, '\n').trim();
    }
    return content.replace(/<sum>[\s\S]*?<\/sum>/i, block);
  }

  if (!block) return content;
  return `${content.trim()}\n\n${block}`;
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

export const replaceUiActions = (content: string, nextUiActions: string): string => {
  if (!hasPseudoLayer(content)) return content;
  const trimmed = nextUiActions.trim();
  const block = trimmed ? `<ui_actions>\n${trimmed}\n</ui_actions>` : '';

  if (/<ui_actions>[\s\S]*?<\/ui_actions>/i.test(content)) {
    if (!block) {
      return content.replace(/\n*\s*<ui_actions>[\s\S]*?<\/ui_actions>\s*\n*/i, '\n').trim();
    }
    return content.replace(/<ui_actions>[\s\S]*?<\/ui_actions>/i, block);
  }

  if (!block) return content;
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
    cleanInput ? `本轮输入已记录：${cleanInput}` : '当前楼层已建立，等待新的正文写入。',
    '如果本层仍显示这段占位文本，说明模型回复没有成功写回 maintext。',
    input.sceneHint ? `场景参考：${input.sceneHint}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const sumParts = [
    `地点:${input.location}`,
    `时间:${input.gameTime || '未知'}`,
    cleanInput ? `输入:${cleanInput}` : '',
    `状态:信誉${input.reputation}/币${input.credits}`,
  ].filter(Boolean);

  return buildPseudoLayerFromParts({
    maintext,
    sum: sumParts.join(' | '),
  });
};
