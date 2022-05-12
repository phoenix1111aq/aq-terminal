import React from "react";
import { comService } from './../../services/comService';
import { ArguCulture } from 'arguculture';
import { sndService } from "../../services/sndService";
import { aqCrypto } from "../../../../aq-server/src/aqCrypto";
import { TScreenState } from "../../types";
import manifest from '../../manifest.json';
import "./terminal.scss";

const terminalId = `${aqCrypto.generateKey(15, 'upperCase', 'numbers')}`;
const prefix = `AQT${terminalId}:>`;

export class Terminal extends React.Component {

    private _elDivCommand = React.createRef<HTMLDivElement>();
    private _terminalId: string;

    state: {
        command: string;
        log: Array<string>;
        cursorPos: number;
        freeze: boolean;
        screenState: TScreenState
    };

    private _setFocus() {
        if (!this._elDivCommand.current) { return; }
        this._elDivCommand.current.focus();
        this._caretToEnd();
    }

    public constructor(props: any) {
        super(props);
        this.state = {
            command: "",
            log: [],
            cursorPos: 0,
            freeze: false,
            screenState: 'ON'
        };
        this.printIntro();

        comService.onServerLog = (message: string) => {
            this.print(true, message);
        }

        window.addEventListener('click', () => {
            this._setFocus();
        });

        window.addEventListener('animationend', (ev) => {
            if (ev.animationName === 'kf-anim-screen-on') {
                sndService.beepOk();
                this._setFocus();
            }
        });
    }

    private _caretToEnd() {
        var el = this._elDivCommand.current;
        var range = document.createRange()
        var sel = window.getSelection()
        range.setStart(el, el.innerText.length);
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
    }

    private printTerminalInfo() {
        this.print(false,
            `Aquarius Terminal by Aquarius Systems Inc.`,
            '&nbsp;'
        );

        this.print(false,
            `${manifest.name} ${manifest.version} | Build #${manifest.build.number}`,
            `Build Date: ${new Date(manifest.build.date).toLocaleString()} (IL)`,
            `Terminal S/N: ${manifest.terminal.serial}`,
            `Terminal ID: ${terminalId}`,
            `Gateway: ${manifest.server.defaultGateway}`,
            `Protocol Version: ${manifest.server.protocolVersion}`,
            `Encryption Hash: ${manifest.crypto.keyHash}`,
            //`ArguCulture Version: ${ArguCulture.version}`,
            //`GuardAngel Version: 1.0`,
            '&nbsp;'
        );
    }

    private printIntro() {
        const introMessage =
            atob(`ICAgIF8gICBfX18gICAgX19fX18gICAgICAgICAgICAgIF8gICAgICAgICAgIF8gCiAgIC9fXCAv
            IF8gXCAgfF8gICBffF9fIF8gXyBfIF9fIChfKV8gXyAgX18gX3wgfAogIC8gXyBcIChfKSB8ICAg
            fCB8LyAtXykgJ198ICcgIFx8IHwgJyBcLyBfYCB8IHwKIC9fLyBcX1xfX1xfXCAgIHxffFxfX198
            X3wgfF98X3xffF98X3x8X1xfXyxffF98CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg
            ICAgICAgICAgICAgICAgIA`);
        const htmlMessage = introMessage.split("\n").map((i) => i.replace(/\s/g, "&nbsp;"));
        this.print(false, ...htmlMessage);
        this.printTerminalInfo();
    }

    private print(prefixed: boolean, ...rows: string[]) {
        if (prefixed) {
            const mapped = rows.map(i => `${prefix} ${i}`);
            this.state.log.push(...mapped);
        } else {
            this.state.log.push(...rows);
        }
        this._updateState()
    }

    private setFreeze(freezed: boolean) {
        if (!this._elDivCommand.current) { return; }
        const inputDiv = this._elDivCommand.current;
        inputDiv.contentEditable = freezed ? 'false' : 'true';
        this.state.freeze = freezed;
        this._updateState()
        if (!freezed) {
            this._setFocus();
        }
    }

    private _updateState() {
        this.setState({ ...this.state });
    }

    getInputDiv() {
        const styleVisibility = { display: this.state.freeze ? 'none' : '' };
        return <div className="input"
            style={styleVisibility}>
            <div className="prefix">{prefix} </div>
            <div contentEditable="true"
                ref={this._elDivCommand}
                className="command"
                spellCheck={false}
                onKeyDown={async (ev) => {
                    const val = ev.currentTarget.innerText;
                    const element = ev.currentTarget;

                    const clear = () => {
                        setTimeout(() => { element.innerHTML = ''; }, 0);
                    }

                    if (ev.key === "Enter") {

                        if (this.state.screenState === 'OFF') {
                            this.state.screenState = 'ON';
                            this._updateState();
                            return;
                        }

                        const command = val;
                        clear();
                        this.print(true, command);

                        type TArgs = 'ws' | 'open' | 'close' | 'cls' |
                            'term' | 'echo' | 'delay' | 'auth' | 'user' |
                            'pass' | 'host' | 'gateway' | 'beep' | 'off';
                        let args: { [key in TArgs]: string | number; };

                        try {
                            args = new ArguCulture<TArgs>(command).arguments;
                        } catch (err) {
                            sndService.beepError();
                            this.print(err);
                        }

                        if (args.off) {
                            this.state.screenState = 'OFF';
                            this._updateState();
                            return;
                        }
                        if (args.beep) {
                            sndService.beepError();
                            return;
                        } else if (args.ws) {

                            if (!args.open && !comService.isConnected) {
                                this.print(true, 'Error: Connection Closed');
                                sndService.beepError();
                                return;
                            }

                            if (args.auth) {
                                try {
                                    this.print(true, `Requesting Authentication | ${args.user} ${args.pass}`);
                                    const result = await comService.authenticate(args.user as string, args.pass.toString());
                                    this.print(true, `Authentication Completed: ${result.messageId} | ${result.timestamp}`);
                                    this.print(true, `Token: ${result.body.token}`);
                                    sndService.beepConfirmed();
                                } catch (err) {
                                    sndService.beepError();
                                    this.print(true, `Authentication Failed: ${err}`);
                                }
                            }
                            if (args.echo) {
                                try {
                                    this.print(true, 'Requesting Echo...');
                                    const delay = args.delay || 0;
                                    const result = await comService.echo(args.echo as string, delay as number);
                                    sndService.beepOk();
                                    this.print(true, `Server Responded: ${result.body.message} | ${result.messageId} | ${result.timestamp}`);
                                } catch (err) {
                                    sndService.beepError();
                                    this.print(true, `Echo Failed: ${err}`);
                                }
                            }
                            else if (args.open) {
                                try {
                                    this.setFreeze(true);
                                    const gateway = args.gateway as string || manifest.server.defaultGateway;
                                    this.print(true, 'Connecting: ' + gateway);
                                    await comService.connect(gateway);
                                    this.print(true, 'Connected')
                                } catch (err) {
                                    sndService.beepError();
                                    this.print(true, 'Connection Failed');
                                } finally {
                                    this.setFreeze(false);
                                }

                            }
                            else if (args.close) {
                                if (comService.isConnected) {
                                    comService.close();
                                    this.print(true, `Connection Closed`);
                                } else {
                                    sndService.beepError();
                                    this.print(true, 'Connection Already Closed');
                                }
                            } else {
                                this.print(true, `Connection State: ${comService.state.toString()}`);
                            }
                        } else if (args.cls) {
                            this.state.log = [];
                            this._updateState()
                        } else if (args.term) {
                            this.printTerminalInfo();
                        } else {
                            sndService.beepError();
                            this.print(true, `Unknown Command '${command}'`);
                        }
                    }
                }}
            />

            <div className="caret blinker" style={styleVisibility} />
        </div>
    }

    render() {
        const terminalClass = ['terminal'];
        switch (this.state.screenState) {
            case 'ON':
                terminalClass.push('anim-screen-on')
                break;
            case 'OFF':
                terminalClass.push('anim-screen-off')
                break;
        }
        const className = terminalClass.join(' ').toString();
        return (
            <div className={className}>
                <div className="log">
                    {this.state.log.map((row) => {
                        return <div dangerouslySetInnerHTML={{ __html: row }}></div>;
                    })}
                </div>
                {this.getInputDiv()}
                <div className="screen-overlay"></div>
            </div>
        );
    }
}
