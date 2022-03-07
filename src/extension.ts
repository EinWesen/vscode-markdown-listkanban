import * as vscode from 'vscode';

import type MarkdownIt from "markdown-it"
import ListKanbanPlugin from './markdownit-plugin-listkanban';

export function activate(context: vscode.ExtensionContext) {
    return {
        extendMarkdownIt(md: MarkdownIt) {
            return md.use(ListKanbanPlugin);
        }
    };
}