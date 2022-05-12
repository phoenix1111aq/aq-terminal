import { v4 } from 'uuid';
import manifest from '../manifest.json';
import { aqCrypto } from '../util/aqCrypto';
import {
    IAuthenticateRequest,
    IAuthenticateResponse,
    IWSMessageBody,
    IWSMessageRequest,
    IWSMessageResponse,
    TWSMessageRequest,
    IEchoRequest,
    IEchoResponse,
    IWSMessageBase
} from '../../../aq-server/src/types';

class ComService {
    private _webSocket: WebSocket;
    private _messageTimeout: number;
    private _token: string;
    private _gateway: string;

    public onServerLog: (message: string) => void;

    public get isConnected(): boolean {
        if (!this._webSocket) {
            return false;
        }
        return this._webSocket.readyState === WebSocket.OPEN;
    }

    public get state(): number {
        if (!this._webSocket) {
            return -1;
        }
        return this._webSocket.readyState;
    }

    constructor() {
        //Set message response timeout (10 seconds)
        this._messageTimeout = 1000;
        this._gateway = manifest.server.defaultGateway;
    }

    /** Send authentication request to server */
    public async echo(message: string, delay: number = 0) {
        //Create request body with authentication request data
        const requestBody: IEchoRequest = {
            message: message,
            delay: delay
        };

        const response = await this.sendMessage<IEchoRequest, IEchoResponse>('echo', requestBody);
        return response;
    }

    /** Send authentication request to server */
    public async authenticate(userName: string, password: string) {
        //Create request body with authentication request data
        const requestBody: IAuthenticateRequest = {
            userName: userName,
            password: password
        };

        //Send authentication message and wait for result
        let response: IWSMessageResponse<IAuthenticateResponse>;
        response = await this.sendMessage<IAuthenticateRequest, IAuthenticateResponse>('authenticate', requestBody);

        return response;
    }

    public async close() {
        this._webSocket.close();
    }

    public async connect(remote: string = manifest.server.defaultGateway) {
        return new Promise((resolve, reject) => {
            try {
                this._webSocket = new WebSocket(remote);
                this._webSocket.onerror = (ev) => {
                    reject(ev);
                };
                this._webSocket.addEventListener('message', (ev) => {
                    try {
                        const decrypted = aqCrypto.decrypt(ev.data);
                        let request: IWSMessageBase<unknown>;
                        try {
                            const parsed = JSON.parse(decrypted);
                            request = parsed;
                        } catch (err) {
                            console.log('Parse Failed', err);
                            reject(err);
                        }

                        if (request.direction === 'Request' && request.type === 'echo') {
                            const requestBody = request.body as IEchoRequest;
                            const logMessage = `AQSWS: ${requestBody.message}`;
                            if (this.onServerLog) {
                                console.log('Piping Log Message to Terminal');
                                this.onServerLog(logMessage);
                            }
                            console.log(logMessage);
                        }
                    } catch (err) {
                        console.error('Failed to parse message');
                        return;
                    }
                });
                this._webSocket.onopen = (ev) => {
                    resolve(true);
                };
            } catch (err) {
                reject(`Connection Error: ${err}`);
            }
        });
    }

    public async sendMessage<TReqBody, TResBody>(
        type: TWSMessageRequest,
        body: IWSMessageBody
    ): Promise<IWSMessageResponse<TResBody>> {
        return new Promise((resolve, reject) => {
            let activeTimeout: NodeJS.Timeout;
            const messageId = v4();
            const timestamp = Date.now();
            const wsMessage: IWSMessageRequest<TReqBody> = {
                direction: 'Request',
                messageId: messageId,
                timestamp: timestamp,
                token: this._token,
                type: type,
                body: body as TReqBody
            };

            //Throw error if websocket is not connected
            if (this._webSocket.readyState !== WebSocket.OPEN) {
                throw 'Connection Error: WebSocket is not connected';
            }

            /** Removes event listener and clears timeout */
            const removeListener = () => {
                this._webSocket.removeEventListener('message', eventListener);
                if (activeTimeout) {
                    clearTimeout(activeTimeout);
                }
            };

            /** Adds event listener to detect message response */
            const eventListener = (message: MessageEvent) => {
                const decrypted = aqCrypto.decrypt(message.data);
                const response: IWSMessageResponse<TResBody> = JSON.parse(decrypted);

                if (response.messageId === messageId) {
                    if (response.error) {
                        return reject(`Connection Error: Server responded with error: ${response.error}`);
                    }

                    //Remove active listener
                    removeListener();
                    //If server responded with error, reject promise (with return)

                    //Resolve promise with the result
                    resolve(response);
                }
            };

            //Add event listener to detect message response
            this._webSocket.addEventListener('message', eventListener);

            //Set timeout to kill listener if no response
            activeTimeout = setTimeout(() => {
                removeListener();
                reject(`Connection Error: Server did not respond to: ${messageId}`);
            }, this._messageTimeout);

            //Stringify message into JSON string
            const messageStr = JSON.stringify(wsMessage);

            //Encrypt message
            const encryptedStr = aqCrypto.encrypt(messageStr);

            //Send message through web socket
            this._webSocket.send(encryptedStr);
        });
    }
}

export const comService = new ComService();

export type TConnectionState = 'Connected' | 'Disconnected';
