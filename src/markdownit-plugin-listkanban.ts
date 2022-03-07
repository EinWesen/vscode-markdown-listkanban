import type MarkdownIt from "markdown-it"
import Renderer from "markdown-it/lib/renderer"

export default function (md:MarkdownIt) {      
  const superFenceRule = md.renderer.rules.fence as Renderer.RenderRule;
  md.renderer.rules.fence = (tokens, idx, options, env, slf) => {
      const token = tokens[idx];
      if (token.block) {
        token.attrJoin('class', 'einwesen-listkanban');
      } 
      return superFenceRule(tokens, idx, options, env, slf);
  };
};