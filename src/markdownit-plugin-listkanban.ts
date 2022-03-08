import MarkdownIt from "markdown-it"
import Renderer from "markdown-it/lib/renderer"
import Token from "markdown-it/lib/token"

function renderFenceBlock(md:MarkdownIt, token:Token, env: any, slf:Renderer) : string {  
  
  const myEnv = {};
  const children = (md.parse(token.content, myEnv) as Token[]);
  
  var resultHTML = '<div class="einwesen-listkanban-board">';
  
  let headerisOpen: boolean = false;
  let prevType:string = '';
    
  // TODO: better POP ?
  for (var tok of children) {
    switch (tok.type) {
      case 'heading_open':
        if (headerisOpen) {
            resultHTML += '</div>';
        }
        headerisOpen = true;
        resultHTML += '<div class="einwesen-listkanban-col einwesen-listkanban-border-color">';
        break;
      case 'inline':         
        switch(prevType) {
          case 'heading_open':  
            resultHTML += '<div>';
            resultHTML += slf.render(tok.children as Token[], md.options, myEnv)
            resultHTML += '</div>';
            break;
//          case 'list_item_open':            
//            resultHTML += '<span>';
//            inlineTokens.forEach(t => resultTokens.push(t));
//            resultHTML += '</span>';
//            break;
          case 'paragraph_open':
            let inlineTokens:Token[] = [];
            for(let t of tok.children as Token[]) {
              if(t.type == 'hardbreak') break;
              inlineTokens.push(t);
            }
            resultHTML += slf.render(inlineTokens, md.options, myEnv);
            break;
          default:
        } 
        break;
      case 'heading_close':
        break;  
      case 'bullet_list_open':
        tok.attrJoin('class', 'einwesen-listkanban-source'); // for list View
        if (tok.level != 0) resultHTML += '<div>';
        resultHTML += '<ul>';
        break;
      case 'bullet_list_close':
        if (tok.level != 0) resultHTML += '</div>';
        resultHTML += '</ul>';
        break;
      case 'list_item_open':
        if (tok.markup == '+') {
          tok.attrJoin('class', 'einwesen-listkanban-done'); // for list View
          resultHTML += '<li class="einwesen-listkanban-done">';
        } else {
          resultHTML += '<li>';
        }
        break;
      case 'list_item_close':
        resultHTML += '</li>';
        break;
      case 'paragraph_open':
        resultHTML += '<span>';
        break;
      case 'paragraph_close':    
        resultHTML += '</span>';
        break;
      default:
    }
    prevType = tok.type;
  }

  if (headerisOpen) {
    resultHTML += '</div>';
  }
          
  resultHTML += '</div>';
  return resultHTML + '\n' + slf.render(children, md.options, myEnv);
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