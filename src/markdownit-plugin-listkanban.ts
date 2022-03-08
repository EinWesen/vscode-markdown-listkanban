import MarkdownIt from "markdown-it"
import Renderer from "markdown-it/lib/renderer"
import Token from "markdown-it/lib/token"

function renderFenceBlock(md:MarkdownIt, token:Token, env: any, slf:Renderer) : string {  
  
  const myEnv = {};
  const children = (md.parse(token.content, myEnv) as Token[]);
  
  var resultHTML = '<div class="einwesen-listkanban-board">\n';
  
  let headerisOpen:boolean = false;
  let prevType:string = '';
    
  // TODO: better POP ?
  for (var tok of children) {
    let tokenHTML:string = '';    
    switch (tok.type) {
      case 'heading_open':
        if (headerisOpen) {
            tokenHTML += '  </div>\n';
        }
        headerisOpen = true;
        tokenHTML += '  <div class="einwesen-listkanban-col einwesen-listkanban-border-color">\n';
        break;
      case 'inline':         
        switch(prevType) {
          case 'heading_open':  
            tokenHTML += '    <div>';
            tokenHTML += slf.render(tok.children as Token[], md.options, myEnv)
            tokenHTML += '</div>\n';
            break;
//          case 'list_item_open':            
//            tokenHTML += '<span>';
//            inlineTokens.forEach(t => resultTokens.push(t));
//            tokenHTML += '</span>';
//            break;
          case 'paragraph_open':
            let inlineTokens:Token[] = [];
            for(let t of tok.children as Token[]) {
              if(t.type == 'hardbreak') break;
              inlineTokens.push(t);
            }
            tokenHTML += slf.render(inlineTokens, md.options, myEnv);
            break;
          default:
        } 
        break;
      case 'heading_close':
        break;  
      case 'bullet_list_open':
        tok.attrJoin('class', 'einwesen-listkanban-source'); // for list View
        tokenHTML += '  '.repeat(3+tok.level);
        if (tok.level != 0) tokenHTML += '<div>';
        tokenHTML += '<ul>\n';
        break;
      case 'bullet_list_close':
        tokenHTML += '  '.repeat(3+tok.level);
        tokenHTML += '</ul>';
        if (tok.level != 0) tokenHTML += '</div>';
        tokenHTML += '\n';
        break;
      case 'list_item_open':
        tokenHTML += '  '.repeat(3+tok.level);
        if (tok.markup == '+') {
          tok.attrJoin('class', 'einwesen-listkanban-done'); // for list View
          tokenHTML += '<li class="einwesen-listkanban-done">';
        } else {
          tokenHTML += '<li>';
        }
        tokenHTML += '\n';
        break;
      case 'list_item_close':
        tokenHTML += '  '.repeat(3+tok.level);
        tokenHTML += '</li>\n';
        break;
      case 'paragraph_open':
        tokenHTML += '  '.repeat(3+tok.level);
        tokenHTML += '<span>';
        break;
      case 'paragraph_close':    
        tokenHTML += '</span>\n';
        break;
      default:
    }

    resultHTML += tokenHTML;
    prevType = tok.type;
    //console.log(tok.block, tok.type, tok.level, tok.nesting, tokenHTML);
  }

  if (headerisOpen) {
    resultHTML += '  </div>\n';
  }
          
  resultHTML += '</div>';
  return resultHTML + '\n' + '<hr>'+ slf.render(children, md.options, myEnv);
}

export default function (md:MarkdownIt) {      
  const superFenceRule = md.renderer.rules.fence as Renderer.RenderRule;
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
      const token = tokens[idx];
      if (token.block && token.info.indexOf('listkanban')>-1) {
        return renderFenceBlock(md, token,env, slf);
      } else {
        return superFenceRule(tokens, idx, options, env, slf);
      }
  };
};