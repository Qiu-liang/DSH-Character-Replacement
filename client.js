window.__ModuleLoader__.load({
  id: '@local/rice-swap',
  factory(require) {
    // Longest alternative first so "token" is not consumed by "tok".
    const REPLACE_RE = /token|tok/gi;
    const HAS_RE = /token|tok/i;
    const TEXT_ATTRIBUTES = [
      'placeholder',
      'title',
      'alt',
      'aria-label',
      'aria-description',
      'aria-valuetext',
      'data-placeholder',
      'data-tooltip',
    ];
    // Never rewrite editable content, even if a scoped section ever contains it.
    const SKIP_TEXT = [
      'script',
      'style',
      'noscript',
      'template',
      'textarea',
      'input',
      '[contenteditable]:not([contenteditable="false"])',
    ].join(',');

    // The only visible areas this plugin may touch:
    //   - the composer's "session statistics" and "usage" pills
    //   - their portaled dialogs
    //   - the per-turn "turn usage" trigger and its portaled dialog
    const STAT_ANCHOR =
      '[data-composer-stat="activity"], [data-composer-stat="usage"]';
    const STAT_DIALOG_DATA =
      '[data-session-stats-details], [data-session-stats-usage], [data-turn-usage-details]';
    const DIALOG = '[role="dialog"]';
    const SCOPE_ATTR = 'data-rice-swap-scope';
    const TRIGGER_ATTR = 'data-rice-swap-turn-usage';
    const IN_SCOPE = `${STAT_ANCHOR}, [${SCOPE_ATTR}], [${TRIGGER_ATTR}]`;
    const TURN_TRIGGER_CLASS = 'sZXytW_trigger';
    const DISCOVER = `${STAT_ANCHOR}, ${STAT_DIALOG_DATA}, button[aria-haspopup="dialog"]`;

    const replaceWords = (value) =>
      value.replace(REPLACE_RE, (match) =>
        match.length === 5 ? '大米' : '斤',
      );

    function replaceTextNode(node) {
      const value = node.nodeValue;
      if (!value || !HAS_RE.test(value)) return;
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_TEXT)) return;
      const next = replaceWords(value);
      if (next !== value) node.nodeValue = next;
    }

    function replaceAttributes(element) {
      if (!element.hasAttributes()) return;
      for (const name of TEXT_ATTRIBUTES) {
        const value = element.getAttribute(name);
        if (value === null || !HAS_RE.test(value)) continue;
        const next = replaceWords(value);
        if (next !== value) element.setAttribute(name, next);
      }
    }

    function replaceSubtree(root) {
      if (root.nodeType === Node.TEXT_NODE) {
        replaceTextNode(root);
        return;
      }
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      replaceAttributes(root);
      if (root.closest(SKIP_TEXT)) return;

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
      );
      let node = walker.nextNode();
      while (node !== null) {
        if (node.nodeType === Node.ELEMENT_NODE) replaceAttributes(node);
        else replaceTextNode(node);
        node = walker.nextNode();
      }
    }

    function inScope(node) {
      const element =
        node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      return element !== null && element.closest(IN_SCOPE) !== null;
    }

    function markDialog(dataElement) {
      const panel =
        dataElement.closest(DIALOG) ??
        dataElement.parentElement ??
        dataElement;
      if (panel.nodeType !== Node.ELEMENT_NODE) return;
      if (panel.hasAttribute(SCOPE_ATTR)) return;
      panel.setAttribute(SCOPE_ATTR, '');
      replaceSubtree(panel);
    }

    function isTurnTrigger(element) {
      if (element.tagName !== 'BUTTON') return false;
      if (element.getAttribute('aria-haspopup') !== 'dialog') return false;
      if (element.closest(STAT_ANCHOR)) return false;
      if (element.hasAttribute(TRIGGER_ATTR)) return false;
      const text = (element.textContent ?? '').trim();
      if ((text.startsWith('用量') || text.startsWith('Usage')) && /\d/.test(text)) {
        return true;
      }
      return element.classList.contains(TURN_TRIGGER_CLASS);
    }

    function markTurnTrigger(button) {
      if (button.hasAttribute(TRIGGER_ATTR)) return;
      button.setAttribute(TRIGGER_ATTR, '');
      replaceSubtree(button);
    }

    function ensureTurnTrigger(node) {
      const element =
        node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      if (!element) return;
      const button = element.closest('button[aria-haspopup="dialog"]');
      if (button !== null && isTurnTrigger(button)) markTurnTrigger(button);
    }

    function discover(root) {
      if (root.nodeType === Node.TEXT_NODE) {
        if (inScope(root)) replaceTextNode(root);
        return;
      }
      if (root.nodeType !== Node.ELEMENT_NODE) return;

      if (inScope(root)) replaceSubtree(root);

      const candidates = [];
      if (root.matches(DISCOVER)) candidates.push(root);
      for (const element of root.querySelectorAll(DISCOVER)) {
        candidates.push(element);
      }
      for (const element of candidates) {
        if (element.matches(STAT_ANCHOR)) {
          replaceSubtree(element);
        } else if (element.matches(STAT_DIALOG_DATA)) {
          markDialog(element);
        } else if (isTurnTrigger(element)) {
          markTurnTrigger(element);
        }
      }
    }

    return {
      apply(ctx) {
        ctx.effect(() => {
          let disposed = false;
          const observer = new MutationObserver((records) => {
            if (disposed) return;

            // First mark newly added scopes and dialogs, then rewrite the text
            // and attributes. This order makes a freshly opened dialog fully
            // in scope before its own characterData records are handled.
            for (const record of records) {
              if (record.type !== 'childList') continue;
              for (const node of record.addedNodes) {
                if (!node.isConnected) continue;
                if (node.nodeType === Node.TEXT_NODE) {
                  ensureTurnTrigger(node);
                  if (inScope(node)) replaceTextNode(node);
                } else {
                  discover(node);
                }
              }
            }

            for (const record of records) {
              if (record.type === 'characterData') {
                ensureTurnTrigger(record.target);
                if (inScope(record.target)) replaceTextNode(record.target);
              } else if (record.type === 'attributes') {
                if (inScope(record.target)) replaceAttributes(record.target);
              }
            }
          });

          const root = document.documentElement;
          if (root) {
            observer.observe(root, {
              subtree: true,
              childList: true,
              characterData: true,
              attributes: true,
              attributeFilter: TEXT_ATTRIBUTES,
            });
            discover(root);
          }

          return () => {
            disposed = true;
            observer.disconnect();
            for (const element of document.querySelectorAll(
              `[${SCOPE_ATTR}], [${TRIGGER_ATTR}]`,
            )) {
              element.removeAttribute(SCOPE_ATTR);
              element.removeAttribute(TRIGGER_ATTR);
            }
          };
        }, 'rice-swap');
      },
    };
  },
});
