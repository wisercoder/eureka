// Copyright (c) 2019-present, Rajeev-K.

import { App } from "../App";
import { HistoryPage, HistoryPageProps } from "../views/HistoryPage";
import { MessageBox } from "../views/MessageBox";
import { CommitHeader } from "../models/CommitHeader";
import * as Utils from "../Utils";

export class HistoryController extends MvcRouter.Controller {
    private historyPage: HistoryPage;
    private path: string;
    private commits: CommitHeader[];

    constructor(protected app: App) {
        super();
    }

    public load(params: MvcRouter.QueryParams): void {
        super.load(params);

        this.path = params['path'];
        const props: HistoryPageProps = {
            path: this.path,
            onHistoryClick: (index: number) => this.onHistoryClick(index)
        };
        props.ref = component => {
            if (component) {
                this.historyPage = component;
                this.initPage();
            }
        };
        const element = UIBuilder.createElement(HistoryPage, props) as HTMLElement;
        const appBody = this.app.getAppBody();
        appBody.innerHTML = '';
        appBody.appendChild(element);
    }

    private initPage(): void {
        fetch(`/eureka-service/api/git/history?path=${encodeURIComponent(this.path)}`)
            .then(response => response.json())
            .then(result => {
                if (this.isLoaded()) {
                    if (result.error) {
                        this.historyPage.displayError(result);
                    }
                    else {
                        this.commits = result;
                        this.historyPage.displayHistory(result);
                    }
                }
            })
            .catch(error => this.isLoaded() && this.historyPage.displayError(error));
    }

    private onHistoryClick(index: number): void {
        if (!this.commits)
            return;
        if (index < 0 || index > this.commits.length - 2)
            return;
        const hash1 = this.commits[index].hashCode;
        const hash2 = this.commits[index + 1].hashCode;
        const height = window.innerHeight;
        const width = window.innerWidth;
        const left = window.screenLeft + 15;
        const top = window.screenTop;
        const spec = `width=${width}, height=${height}, left=${left}, top=${top}`;
        window.open(`/search/diff?path=${encodeURIComponent(this.path)}&hash1=${hash1}&hash2=${hash2}`, "eureka-diff", spec);
    }
}
