import MarkdownIt from "markdown-it"
import Renderer from "markdown-it/lib/renderer"
import Token from "markdown-it/lib/token"
import StateBlock from 'markdown-it/lib/rules_block/state_block'

const COLOR_KEY = 'einwesen.listkanban.colorkey';

function tokenize_fence_list_kanban(md: MarkdownIt, state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  var marker, len, params, nextLine, mem, token, markup,
    haveEndMarker = false,
    pos = state.bMarks[startLine] + state.tShift[startLine],
    max = state.eMarks[startLine];
  // if it's indented more than 3 spaces, it should be a code block
  if (state.sCount[startLine] - state.blkIndent >= 4) { return false; }

  if (pos + 3 > max) { return false; }

  marker = state.src.charCodeAt(pos);

  if (marker !== 167/* § */) {
    return false;
  }

  // scan marker length
  mem = pos;
  pos = state.skipChars(pos, marker);

  len = pos - mem;

  if (len < 3) { return false; }

  markup = state.src.slice(mem, pos);
  params = state.src.slice(pos, max);

  if (marker === 167 /* ` */) {
    if (params.indexOf(String.fromCharCode(marker)) >= 0) {
      return false;
    }
  }

  // Since start is found, we can report success here in validation mode
  if (silent) { return true; }

  // search end of block
  nextLine = startLine;

  for (; ;) {
    nextLine++;
    if (nextLine >= endLine) {
      // unclosed block should be autoclosed by end of document.
      // also block seems to be autoclosed by end of parent
      break;
    }

    pos = mem = state.bMarks[nextLine] + state.tShift[nextLine];
    max = state.eMarks[nextLine];

    if (pos < max && state.sCount[nextLine] < state.blkIndent) {
      // non-empty line with negative indent should stop the list:
      // - ```
      //  test
      break;
    }

    if (state.src.charCodeAt(pos) !== marker) { continue; }

    if (state.sCount[nextLine] - state.blkIndent >= 4) {
      // closing fence should be indented less than 4 spaces
      continue;
    }

    pos = state.skipChars(pos, marker);

    // closing code fence must be at least as long as the opening one
    if (pos - mem < len) { continue; }

    // make sure tail has spaces only
    pos = state.skipSpaces(pos);

    if (pos < max) { continue; }

    haveEndMarker = true;
    // found!
    break;
  }

  // If a fence has heading spaces, they should be removed from its inner block
  len = state.sCount[startLine];

  state.line = nextLine + (haveEndMarker ? 1 : 0);

  const hidden = params.indexOf('properties') > -1;

  if (!hidden) {

    token = state.push('fence_einwesen_listkanban_open', '', 1);
    token.block = true;
    token.info = params;
    token.markup = markup;
    token.map = [startLine, state.line];
    token.hidden = hidden;

    token.tag = 'div';
    token.attrSet('class', 'einwesen-listkanban-board');

    let blockString = state.getLines(startLine + 1, nextLine, len, true);
    const markdowntoken: Token[] = md.parse(blockString, {});
    retokenize_kanban_list_content(md, state, markdowntoken);

    token = state.push('fence_einwesen_listkanban_close', '', -1);
    token.block = true;
    token.info = params;
    token.markup = markup;
    token.map = [startLine, state.line];
    token.tag = 'div';
    token.hidden = hidden;

    for (let m of markdowntoken) {
      if (m.type == 'inline' ) m.content = ''; // Do not understand why
      state.tokens.push(m);
    }
  } else {

    const lineStr = state.getLines(startLine + 1, nextLine, len, true);
    const regexp = /(.*)=(.*)/g;
    const result = new Map();
    for (let m of lineStr.matchAll(regexp)) {
      result.set(m[1], m[2]);
    };
    state.env[COLOR_KEY] = result;
  }

  return true;
};

function retokenize_kanban_list_content(md: MarkdownIt, state: StateBlock, contentTokens: Token[]) {
  const colorMap = state.env[COLOR_KEY] != undefined ? state.env[COLOR_KEY] as Map<string, string> : new Map<string, string>();

  let token;
  let lastBlockToken: Token = new Token('', '', 0); // compiler shutup
  let pendingTokens = [];
  let taskTokens: Token[] = []
  let taskLevel = 0;

  for (let content of contentTokens) {
    switch (content.type) {
      case 'heading_open':
        if (content.markup == '#') {
          for (let item of pendingTokens) {
            state.tokens.push(item);
          }
          pendingTokens = [];

          lastBlockToken = state.push('einwesen_listkanban_col_open', 'div', 1);
          lastBlockToken.attrJoin('class', 'einwesen-listkanban-col einwesen-listkanban-border-color');
          lastBlockToken.meta = { contentTag: 'div' };
          lastBlockToken.level = 1;
          pendingTokens.push(new Token('einwesen_listkanban_col_close', 'div', -1));
          pendingTokens[pendingTokens.length - 1].level = 1;
        } else if (content.markup == '##') {
          lastBlockToken = state.push('einwesen_listkanban_subheading', 'div', 0);
          lastBlockToken.level = 2;
        }
        break;
      case 'bullet_list_open':
        taskLevel += 1;
        break;
      case 'bullet_list_close':
        taskLevel -= 1;
        break;
      case 'list_item_open':
        lastBlockToken = new Token('einwesen_listkanban_task', 'li', 0);
        lastBlockToken.level = taskLevel;
        lastBlockToken.markup = content.markup;

        switch (lastBlockToken.markup) {
          case '+':
            lastBlockToken.attrJoin('class', 'einwesen-listkanban-done');
            break;
          default:
        }        

        if (taskLevel == 1) {
          state.tokens.push(lastBlockToken);
        }

        var lastLevel = taskTokens.length == 0 ? -9 : (taskTokens[taskTokens.length - 1] as Token).level;

        if (taskLevel < lastLevel) {
          taskTokens = taskTokens.slice(0, taskLevel - 1);
          lastLevel = taskLevel - 1;
        } else if (taskLevel == lastLevel) {
          taskTokens.pop();
        }

        if (taskTokens.length > 0) {
          const parent = (taskTokens[taskTokens.length - 1] as Token);        
          if (parent.children) {
              parent.children.push(lastBlockToken);
          } else {
            parent.children = [lastBlockToken];
          }
        }
        taskTokens.push(lastBlockToken);        
        break;
      case 'list_item_close':
      case 'heading_close':
        break; // not needed
      case 'paragraph_open':
      case 'paragraph_close':
        break; // fully ignore
      case 'inline':
        lastBlockToken.content = md.renderer.render(content.children as Token[], md.options, {});

        if (colorMap.size > 0 && lastBlockToken.content.indexOf('@') > -1) {
          var colorMatch: any = /@([^ $]*)/g.exec(lastBlockToken.content);
          if (colorMatch != null) {
            const color = colorMap.get(colorMatch[1]);
            if (color != undefined) {
              lastBlockToken.content = lastBlockToken.content.replace('@' + colorMatch[1], '');
              taskTokens[0].attrJoin('style', 'background-color:' + color + ';');
            }
          }
        }

        break;
      default:
    }
  }

  for (let item of pendingTokens) {
    state.tokens.push(item);
  }

}


function renderContent(token: Token, options: MarkdownIt.Options, env: any, slf: Renderer): string {
  let result = '';
  if (token.meta?.contentTag) {
    result = '\n' + '  '.repeat(1 + token.level);
    result += '<' + token.meta?.contentTag + '>';
  }

  if (token.content) {
    result += token.content;
  } else if (token.children) {
    result += slf.render(token.children, options, env);
  }

  if (token.meta?.contentTag) {
    result += '</' + token.meta?.contentTag + '>\n';
  }

  return result;
}


function renderTag(tokens: Token[], idx: number, options: MarkdownIt.Options, env: any, slf: Renderer): string {
  const token = tokens[idx];
  let result = '  '.repeat(0 + token.level);
  if (token.nesting == 1) {
    result += '<' + token.tag + slf.renderAttrs(token) + '>';
    result += renderContent(token, options, env, slf);
  } else if (token.nesting == -1) {
    result += renderContent(token, options, env, slf);
    result += '</' + token.tag + '>\n';
  } else if (token.nesting == 0) {
    result += '<' + token.tag + slf.renderAttrs(token) + '>';
    result += renderContent(token, options, env, slf);
    result += '</' + token.tag + '>\n';
  }

  return result;
}

function renderTasks(token: Token, options: MarkdownIt.Options, env: any, slf: Renderer): string {
  let result = '';

  if (token.markup == '*' || token.hidden) return result;
  
  if (token.children && token.children.length > 0) {
    result += '  '.repeat(4 + token.level);
    result += '<li' + slf.renderAttrs(token) + '>\n';
    result += '  '.repeat(5 + token.level);
    result += '<span>';
    result += token.content;
    result += '</span>\n';
    result += '  '.repeat(5 + token.level);
    result += '<div><ul>\n';

    for (let child of token.children) {
      result += renderTasks(child, options, env, slf);
    }

    result += '  '.repeat(5 + token.level);
    result += '</ul></div>\n';
    result += '  '.repeat(4 + token.level);
    result += '</li>\n';

  } else {
    result += '  '.repeat(4 + token.level + 1);
    result += '<li' + slf.renderAttrs(token) + '><span>';
    result += token.content;
    result += '</span></li>\n';
  }

  return result;
}

export default function (md: MarkdownIt) {
  md.block.ruler.before('fence', 'fence_einwesen_listkanban', (state, startLine, endLine, silent) => {
    return tokenize_fence_list_kanban(md, state, startLine, endLine, silent);
  });
  md.renderer.rules['einwesen_listkanban_col_open'] = renderTag;
  md.renderer.rules['einwesen_listkanban_subheading'] = renderTag;
  md.renderer.rules['einwesen_listkanban_col_close'] = renderTag;
  md.renderer.rules['einwesen_listkanban_task'] = (tokens: Token[], idx: number, options: MarkdownIt.Options, env: any, slf: Renderer) => {
    let result = '  '.repeat(3) + '<ul>\n';
    result += renderTasks(tokens[idx], options, env, slf);
    result += '  '.repeat(3) + '</ul>\n';
    return result;
  };
};