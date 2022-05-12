class SndService {
    private _audioContext: AudioContext;
    private _osciliator: OscillatorNode;
    private _gain: GainNode;
    constructor() {
        this._audioContext = new AudioContext();

        const volume = 1;

        this._osciliator = this._audioContext.createOscillator();
        this._osciliator.type = 'sine';

        this._gain = this._audioContext.createGain();
        this._osciliator.connect(this._gain);

        this._gain.gain.value = 0;

        this._osciliator.frequency.value = 700;

        this._gain.connect(this._audioContext.destination);
        this._osciliator.start(this._audioContext.currentTime);

    }

    async beepOk() {
        this.beep(60, 1800);
    }

    async beepConfirmed() {
        await this.beep(30, 1500);
        //await this.sleep(30);
        //await this.beep(30, 1000);
    }

    async beepError() {
        await this.beep(100, 1300);
        //await this.sleep(30);
        //await this.beep(100, 1000);
    }

    async sleep(duration: number) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(true);
            }, duration);
        });
    }

    async beep(duration: number, frequency: number, volume: number = 1) {
        return new Promise((resolve, reject) => {
            this._osciliator.frequency.value = frequency;
            const startAt = this._audioContext.currentTime;
            const endAt = this._audioContext.currentTime + (duration / 1000);
            this._gain.gain.setValueAtTime(1,startAt);
            this._gain.gain.setValueAtTime(0,endAt);
  
            this._osciliator.onended = (ev)=> {
                resolve(ev)
            }
        });
    }
}

export const sndService = new SndService();
