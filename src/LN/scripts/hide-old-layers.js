$(() => {
  const HIDDEN_CLASS = 'ln-pseudo0-hidden';
  const FRONTEND_LOADER_PATTERN = /dist\/LN\/index\.html/i;

  const hasPseudoLayer = text => /<maintext>[\s\S]*<\/maintext>/i.test(String(text || ''));
  const isFrontendLoader = text => FRONTEND_LOADER_PATTERN.test(String(text || ''));

  const getChatMessagesSafe = () => {
    if (typeof getLastMessageId !== 'function' || typeof getChatMessages !== 'function') return null;
    try {
      const lastMessageId = getLastMessageId();
      if (!Number.isFinite(lastMessageId) || lastMessageId < 0) return [];
      return getChatMessages(`0-${lastMessageId}`, { role: 'all', hide_state: 'all' });
    } catch {
      return null;
    }
  };

  const shouldActivateForCurrentChat = () => {
    const chatMessages = getChatMessagesSafe();
    if (!chatMessages) return false;
    return chatMessages.some(
      message => message?.role === 'assistant' && (hasPseudoLayer(message.message) || isFrontendLoader(message.message)),
    );
  };

  const showAllLayers = () => {
    $('#chat > .mes').removeClass(HIDDEN_CLASS).css('display', '');
  };

  const applyPseudoZeroView = () => {
    const shouldActivate = shouldActivateForCurrentChat();
    const $messages = $('#chat > .mes');
    $messages.removeClass(HIDDEN_CLASS).css('display', '');
    if (!shouldActivate) return false;
    $messages.not('.last_mes').addClass(HIDDEN_CLASS).css('display', 'none');
    return true;
  };

  applyPseudoZeroView();

  let currentChatId = '';
  try {
    currentChatId = typeof SillyTavern?.getCurrentChatId === 'function' ? String(SillyTavern.getCurrentChatId()) : '';
  } catch {
    currentChatId = '';
  }

  if (typeof eventOn === 'function' && typeof tavern_events !== 'undefined') {
    eventOn(tavern_events.CHAT_CHANGED, chatId => {
      const didChange = currentChatId !== String(chatId);
      if (didChange) {
        currentChatId = String(chatId);
        if (typeof reloadIframe === 'function' && shouldActivateForCurrentChat()) {
          reloadIframe();
        }
      }
      applyPseudoZeroView();
    });

    eventOn(tavern_events.MESSAGE_RECEIVED, applyPseudoZeroView);
    eventOn(tavern_events.MESSAGE_SENT, applyPseudoZeroView);
    eventOn(tavern_events.MESSAGE_UPDATED, applyPseudoZeroView);
  }

  $(window).on('pagehide', () => {
    showAllLayers();
  }
});
