// Copyright (c) 2019-present, Rajeev-K.

import { CommonHeader } from "./CommonHeader";
import { SearchResultItem } from "../models/Models";
import { FilterControl } from "./FilterControl";
import { SplitterControl } from "./SplitterControl";
import { addClassExclusively } from "./ViewUtils";
import * as Utils from "../Utils";

export interface SearchPageProps extends UIBuilder.Props<SearchPage> {
    onSearchClick: () => void;
    onManageClick: () => void;
    onFileClick: (path: string) => void;
}

export class SearchPage extends UIBuilder.Component<SearchPageProps> {
    private editor: monaco.IEditor;
    private root: HTMLElement;
    private splitterControl: SplitterControl;
    private input: HTMLInputElement;
    private hiddenInput: HTMLInputElement;
    private errorDisplay: HTMLElement;
    private searchDisplay: HTMLElement;
    private filterDisplay: HTMLElement;
    private sourceDisplay: HTMLElement;

    constructor(props) {
        super(props);
    }

    private onClearClick(): void {
        this.input.value = '';
    }

    public getQuery(): string {
        return this.input.value;
    }

    public layout(): void {
        this.splitterControl.layout();
        if (this.editor)
            this.editor.layout();
    }

    public displayWelcomeScreen(): void {
        this.root.appendChild(
            <div className="welcome-screen">
                Welcome to <span className="welcome-logo">eureka<i>!</i></span>
                <span> Press the Manage button to add a folder to the search index.</span>
            </div>
        );
    }

    public displayResult(result: SearchResultItem[]): void {
        this.displayError('');
        this.renderResult(result, null);
        this.renderFilter(result);
    }

    private filterResults(result: SearchResultItem[], extensionFilter: string[]): SearchResultItem[] {
        const extensions: { [key: string]: any } = {};
        extensionFilter.forEach(ext => extensions[ext] = true);
        return result.filter(result => extensions[Utils.getFilenameExtension(result.path)]);
    }

    private renderResult(result: SearchResultItem[], extensionFilter: string[]): void {
        const noRowsMessage = extensionFilter ? "No matching results" : "No results returned.";
        const filteredResults = extensionFilter ? this.filterResults(result, extensionFilter) : result;
        const resultDisplay = this.getRendering(filteredResults, noRowsMessage);
        this.searchDisplay.innerHTML = '';
        this.searchDisplay.appendChild(resultDisplay);
    }

    public displayError(error: any): void {
        let message: string;
        if (typeof error === 'string')
            message = error;
        else if (error.message)
            message = error.message;
        else
            message = JSON.stringify(error);
        this.errorDisplay.innerText = message;
    }

    private onResultTableClick(ev): void {
        const row = ev.target.closest(".item-row");
        addClassExclusively(row, "selected-row", Array.from(this.searchDisplay.querySelectorAll(".item-row")));
        const path = ev.target.innerText;
        if (path) {
            this.props.onFileClick(path);
        }
    }

    public displaySourceCode(sourceCode: string, language: string): void {
        this.sourceDisplay.innerHTML = '';
        require(['vs/editor/editor.main'], monaco => {
            this.editor = monaco.editor.create(this.sourceDisplay, {
                language: language,
                readOnly: true,
                scrollBeyondLastLine: false,
                renderLineHighlight: false,
                value: sourceCode
            });
        });
    }

    private getRendering(result: SearchResultItem[], noRowsMessage: string): JSX.Element {
        if (!result || !result.length)
            return <div className="no-rows-message">{noRowsMessage}</div>;
        const rows = result.map(item => <tr className="item-row"><td title="Click to copy to clipboard">{item.path}</td></tr>);
        return (
            <table className="result-table" onClick={ev => this.onResultTableClick(ev)}>
                <tbody>
                    {rows}
                </tbody>
            </table>
        );
    }

    private onKeyPress(ev): void {
        const keyCode = ev.keyCode || ev.which;
        if (keyCode == '13') {
            this.props.onSearchClick();
        }
    }

    private static getFilenameExtensions(items: SearchResultItem[]): string[] {
        const map: { [key: string]: any } = {};
        items.forEach(item => {
            const ext = Utils.getFilenameExtension(item.path);
            if (ext)
                map[ext] = '';
        });
        return Object.keys(map).sort();
    }

    private onFilterChanged(result: SearchResultItem[], extensions: string[]): void {
        this.renderResult(result, extensions);
    }

    private renderFilter(result: SearchResultItem[]): void {
        const extensions = SearchPage.getFilenameExtensions(result);
        const display = extensions.join(' ');
        this.filterDisplay.innerHTML = '';
        const el = <FilterControl extensions={extensions} onFilterChanged={ext => this.onFilterChanged(result, ext)} />;
        this.filterDisplay.appendChild(el);
    }

    private onSplitterMoved(): void {
        if (this.editor)
            this.editor.layout();
    }

    public render(): JSX.Element {
        return (
            <div className="search-page" ref={el => this.root = el}>
                <div className="top-bar">
                    <CommonHeader />
                    <div className="input-panel">
                        <div className="searchbox">
                            <input type="text" className="query-input" spellcheck={false} onKeyPress={ev => this.onKeyPress(ev)}
                                   placeholder="Type search terms here" ref={el => this.input = el} />
                            <button type="button" className="clear-button" onClick={() => this.onClearClick()}>
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="result-filter" ref={el => this.filterDisplay = el}></div>
                    </div>
                    <button type="button" className="default-button" onClick={this.props.onSearchClick}>Search</button>
                    <button type="button" className="manage-button" onClick={this.props.onManageClick}>
                        <i class="fas fa-cog"></i>
                        Manage
                    </button>
                </div>
                <div className="error-message" ref={el => this.errorDisplay = el}></div>
                <SplitterControl className="result-splitter" ref={splitter => this.splitterControl = splitter}
                    onSplitterMoved={() => this.onSplitterMoved()}
                    firstChild={<div className="search-result" ref={el => this.searchDisplay = el}></div> as HTMLElement}
                    secondChild={<div className="source-display" ref={el => this.sourceDisplay = el}></div> as HTMLElement} />
            </div>
        )
    }
}
