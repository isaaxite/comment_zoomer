// ==UserScript==
// @name         Comment Zoomer
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add zoom button in github comment to provide full screen mode, allowing you to write comments more elegantly
// @author       IsaacKam
// @match        https://github.com/*/*/issues/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const namespace = '__ISSUE_EDITOR__';
  const emToggleState = {
    IDLE: '',
    NORMAL: 'normal',
    FULL_SCREEN: 'full_screen'
  };
  const store = {
    sup: null,
    toggleStatus: emToggleState.IDLE
  };

  const nodes = {};
  const intiGetter = (get) => ({ get });
  Object.defineProperties(nodes, {
    discussionBucket: intiGetter(
      () => document.querySelector("#discussion_bucket")),
    caret: intiGetter(
      () => store.sup.querySelector(".timeline-comment--caret")),
    markdownToolbar: intiGetter(
      () => store.sup.querySelector("markdown-toolbar")),
    textarea: intiGetter(
      () => store.sup.querySelector("textarea.js-comment-field")),
    commentFormActions: intiGetter(
      () => store.sup.querySelector('.comment-form-actions')),
    newCommentSup: intiGetter(
      () => nodes.discussionBucket.querySelector('.discussion-timeline-actions')),
    newCommentFormActions: intiGetter(
      () => nodes.newCommentSup.querySelector('#partial-new-comment-form-actions'))
  });

  window[namespace] = {};
  window[namespace].store = store;
  window[namespace].nodes = nodes;

  function initStyle() {
    const style = document.createElement('style');
    const cssText = document.createTextNode(`
      .issue-editor__body--disable-scroll {
        overflow: hidden;
      }
      .issue-editor__entry-btn {
        cursor: pointer;
        user-select: none;
        color: rgb(87, 96, 106);
        margin-left: 2px;
      }
      .issue-editor__caret {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 1001;
      }
      .issue-editor__textarea {
        max-height: none !important;
        height: calc(100vh - 200px) !important;
      }
    `);
    style.appendChild(cssText);
    document.head.appendChild(style);
  }

  function addClass({ node, classname }) {
    const classSet = new Set(node.classList);
    classSet.add(classname);
    node.setAttribute('class', Array.from(classSet).join(' '));
  }

  function removeClass({ node, classname }) {
    const classSet = new Set(node.classList);
    classSet.delete(classname);
    node.setAttribute('class', Array.from(classSet).join(' '));
  }

  function fullScreen() {
    store.toggleStatus = emToggleState.FULL_SCREEN;
    addClass({ node: document.body, classname: 'issue-editor__body--disable-scroll' });
    addClass({ node: nodes.caret, classname: 'issue-editor__caret' });
    addClass({ node: nodes.textarea, classname: 'issue-editor__textarea' });

    nodes.textarea.focus();
  }

  function normalScreen() {
    store.toggleStatus = emToggleState.NORMAL;
    removeClass({ node: document.body, classname: 'issue-editor__body--disable-scroll' });
    removeClass({ node: nodes.caret, classname: 'issue-editor__caret' });
    removeClass({ node: nodes.textarea, classname: 'issue-editor__textarea' });
  }

  function interceptCommentFormActions() {
    if (store.toggleStatus !== emToggleState.FULL_SCREEN) {
      return;
    }
    normalScreen();
  }
  function appendEntry() {
    const classname = 'issue-editor__entry-btn';
    const isExist = nodes.markdownToolbar.querySelector('.' + classname);
    if (isExist) {
      return;
    }

    const node = document.createElement('div');

    addClass({ node, classname })
    node.innerHTML = `[zoom]`;
    node.onclick = function() {
      console.info('[node.onclick] invoked!');
      if (store.toggleStatus === emToggleState.FULL_SCREEN) {
        normalScreen();
        return;
      }
      fullScreen();
    }
    nodes.markdownToolbar.append(node);
    return node;
  }

  function initHistoryCommentEntries() {
    const parent = nodes.discussionBucket.querySelector(".js-discussion.js-socket-channel");
    const findEditBtn = (node) => node.querySelector('.js-comment-edit-button');
    const findAllTimelineItem = (node) => Array.from(node.querySelectorAll('.js-timeline-item'));
    const loopFindEditBtn = (it, cb) => {
      const editBtn = findEditBtn(it);
      if (editBtn) {
        cb(editBtn);
        return;
      }
      setTimeout(() => {
        loopFindEditBtn(it, cb)
      }, 200);
    };
    const findDetailBtn = (node) => node.querySelectorAll('details')[1];
    const getItem = (sup) => ({ sup, sub: findDetailBtn(sup) });
    const main = parent.children[0];
    const rest = parent.children[1];

    const items = [
      getItem(main),
      ...findAllTimelineItem(rest).map(it => getItem(it))
    ].filter(it => it.sub);

    for (const it of items) {
      it.sub.onclick = () => {
        it.sub.onclick = null;
        loopFindEditBtn(it.sub, (editBtn) => {
          editBtn.onclick = () => {
            // editBtn.onclick = null;
            store.sup = it.sup;
            appendEntry();
            nodes.commentFormActions.onclick = interceptCommentFormActions;
          }
        });
      };
    }
  }

  function initNewCommentEntry() {
    store.sup = nodes.newCommentSup;
    appendEntry();
    nodes.newCommentFormActions.onclick = interceptCommentFormActions;
  }

  function ready(cb) {
    if (nodes.discussionBucket) {
      return setTimeout(cb, 200);
    }
    setTimeout(() => ready(cb), 200)
  }

  ready(() => {
    console.info('invoked Issue Editor!');
    initStyle();
    initNewCommentEntry();
    initHistoryCommentEntries();
  });
})();
